import { GoogleGenAI, Type } from "@google/genai";
import type { FunctionDeclaration, LiveConnectConfig } from "@google/genai";
import type { AiLanguage, AiPropertySearchFilters } from "../ai-contract";
import type { PublicPropertyCard } from "../types";
import { searchAiReadableProperties } from "../repository";
import {
  extractAiFilters,
  hasMeaningfulFilters,
  isComparisonRequest,
  isGreeting,
  isSearchableFilterSet,
  relaxAiFilters,
  shouldForceGroundedSearch
} from "./ai-filters";
import {
  getAiTimeoutMs,
  getGeminiApiKey,
  getGeminiFallbackModels,
  getGeminiLiveModel,
  getGeminiLiveTokenMinutes,
  getGeminiLiveVoice,
  getGeminiModel
} from "./ai-config";

type GeminiGenerateContentRequest = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

export type LiveAssistantItem = {
  id: string;
  title: string;
  projectName?: string | null;
  transaction: string;
  type: string;
  price?: number | null;
  rentPrice?: number | null;
  currency?: string | null;
  areaSqm?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  city?: string | null;
  area?: string | null;
  district?: string | null;
  inventoryStatus?: string | null;
  unitCode?: string | null;
  paymentType?: string | null;
  completionStatus?: string | null;
  hasGarden?: boolean | null;
  hasRoof?: boolean | null;
  has360View?: boolean;
  hasPanorama360?: boolean;
  hasSpin360?: boolean;
  amenities?: string[];
  images?: string[];
  listedByName?: string | null;
  listedByCompanyName?: string | null;
  verified?: boolean;
  url?: string;
};

export type LiveExternalSource = {
  title: string;
  uri: string;
};

export type LivePlatformSearchOutput = {
  kind: "platform_search";
  query: string;
  filters: AiPropertySearchFilters;
  total: number;
  items: LiveAssistantItem[];
  relaxedFilters: string[];
  warnings: string[];
  message: string;
};

export type LiveExternalMarketOutput = {
  kind: "external_market";
  query: string;
  text: string;
  sources: LiveExternalSource[];
  model: string | null;
  message: string;
};

export type LiveToolOutput = LivePlatformSearchOutput | LiveExternalMarketOutput;

export const LIVE_PLATFORM_SEARCH_TOOL_NAME = "search_platform_properties";
export const LIVE_EXTERNAL_MARKET_TOOL_NAME = "search_external_market";

const AUDIO_RESPONSE_MODALITIES = ["AUDIO"] as LiveConnectConfig["responseModalities"];

const platformSearchDeclaration: FunctionDeclaration = {
  name: LIVE_PLATFORM_SEARCH_TOOL_NAME,
  description:
    "Search verified Cheque & Key platform listings. Required before answering any property request, recommendation, price, availability, 360 tour, payment plan, or comparison.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The user's property request in natural language, including location, budget, deal type, bedrooms, 360 tour needs, or project names."
      }
    },
    required: ["query"]
  }
};

const externalMarketDeclaration: FunctionDeclaration = {
  name: LIVE_EXTERNAL_MARKET_TOOL_NAME,
  description:
    "Search external public real estate sources when Cheque & Key has no matching verified listings or when the user explicitly asks for off-platform, online, market, or outside-website options. Return source-backed findings only.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The exact external real estate question to research, including location, budget, and property type."
      }
    },
    required: ["query"]
  }
};

let liveAuthClient: GoogleGenAI | null = null;
let externalResearchClient: GoogleGenAI | null = null;

function getConfiguredApiKey() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  return apiKey;
}

function getLiveAuthClient() {
  const apiKey = getConfiguredApiKey();
  if (!liveAuthClient) {
    liveAuthClient = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" }
    });
  }
  return liveAuthClient;
}

function getExternalResearchClient() {
  const apiKey = getConfiguredApiKey();
  if (!externalResearchClient) externalResearchClient = new GoogleGenAI({ apiKey });
  return externalResearchClient;
}

function summarizeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") {
    try {
      return summarizeError(JSON.parse(error));
    } catch {
      return error;
    }
  }
  if (error && typeof error === "object") {
    const nested = (error as { error?: { code?: unknown; message?: unknown; status?: unknown } }).error;
    if (nested) {
      return [nested.code, nested.status, nested.message].filter((value) => value !== undefined && value !== null && value !== "").join(" - ");
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

function isRetryableGeminiError(error: unknown) {
  const details = summarizeError(error).toLowerCase();
  return (
    details.includes("resource_exhausted") ||
    details.includes("unavailable") ||
    details.includes("\"code\":429") ||
    details.includes("\"code\":503") ||
    details.includes("code 429") ||
    details.includes("code 503") ||
    details.includes("high demand") ||
    details.includes("temporarily unavailable") ||
    details.includes("service unavailable") ||
    details.includes("too many requests") ||
    details.includes("quota exceeded") ||
    details.includes("rate limit") ||
    details.includes("not_found") ||
    details.includes("\"code\":404") ||
    details.includes("code 404")
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function generateExternalContentWithFallback(input: {
  label: string;
  buildRequest: (model: string) => GeminiGenerateContentRequest;
}) {
  const ai = getExternalResearchClient();
  const models = [getGeminiModel(), ...getGeminiFallbackModels()];
  let lastError: unknown = null;

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index]!;

    try {
      const response = await withTimeout(ai.models.generateContent(input.buildRequest(model)), getAiTimeoutMs(), `${input.label} (${model})`);
      return { response, model };
    } catch (error) {
      lastError = error;
      const nextModel = models[index + 1];
      if (!nextModel || !isRetryableGeminiError(error)) throw error;
    }
  }

  throw lastError;
}

function asNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toCompactDisplayImages(images: string[] | null | undefined) {
  return (images ?? [])
    .map((image) => image.trim())
    .filter((image) => image.length > 0 && image.length <= 2048 && !image.startsWith("data:"))
    .slice(0, 1);
}

function toLiveAssistantItems(items: PublicPropertyCard[]): LiveAssistantItem[] {
  return items.slice(0, 6).map((item) => ({
    id: item.id,
    title: item.title,
    projectName: item.projectName,
    transaction: item.transaction,
    type: item.type,
    price: asNumber(item.price),
    rentPrice: asNumber(item.rentPrice),
    currency: item.currency,
    areaSqm: asNumber(item.areaSqm),
    bedrooms: asNumber(item.bedrooms),
    bathrooms: asNumber(item.bathrooms),
    city: item.city,
    area: item.area,
    district: item.district,
    inventoryStatus: item.inventoryStatus,
    unitCode: item.unitCode,
    paymentType: item.paymentType,
    completionStatus: item.completionStatus,
    hasGarden: item.hasGarden,
    hasRoof: item.hasRoof,
    has360View: Boolean(item.has360View),
    hasPanorama360: Boolean(item.hasPanorama360),
    hasSpin360: Boolean(item.hasSpin360),
    amenities: item.amenities,
    images: toCompactDisplayImages(item.images),
    listedByName: item.listedByName,
    listedByCompanyName: item.listedByCompanyName,
    verified: Boolean(item.verified),
    url: `/p/${item.id}`
  }));
}

function shouldSearchPlatform(query: string, filters: AiPropertySearchFilters) {
  if (isGreeting(query)) return false;
  return (
    shouldForceGroundedSearch(filters) ||
    isSearchableFilterSet(filters) ||
    isComparisonRequest(query) ||
    Boolean(filters.transaction) ||
    Boolean(filters.type?.length) ||
    Boolean(filters.paymentType) ||
    Boolean(filters.has360View)
  );
}

async function runSearchWithRelaxation(filters: AiPropertySearchFilters) {
  let currentFilters = filters;
  let result = await searchAiReadableProperties(currentFilters);
  let items = toLiveAssistantItems(result.items);
  const relaxedFilters: string[] = [];

  for (let relaxCount = 0; result.total === 0 && relaxCount < 6; relaxCount += 1) {
    const relaxed = relaxAiFilters(currentFilters, relaxedFilters);
    if (relaxed.relaxedKeys.length === 0) break;
    currentFilters = relaxed.filters;
    relaxedFilters.push(...relaxed.relaxedKeys);
    result = await searchAiReadableProperties(currentFilters);
    items = toLiveAssistantItems(result.items);
  }

  return {
    filters: currentFilters,
    total: result.total,
    items,
    relaxedFilters: Array.from(new Set(relaxedFilters))
  };
}

export async function searchLivePlatformProperties(query: string): Promise<LivePlatformSearchOutput> {
  const extracted = extractAiFilters(query);
  const filters = extracted.filters;

  if (!shouldSearchPlatform(query, filters) && !hasMeaningfulFilters(filters)) {
    return {
      kind: "platform_search",
      query,
      filters,
      total: 0,
      items: [],
      relaxedFilters: [],
      warnings: extracted.warnings,
      message: "The request does not include enough property search criteria yet. Ask for location, budget, deal type, or property type."
    };
  }

  const search = await runSearchWithRelaxation(filters);

  return {
    kind: "platform_search",
    query,
    filters: search.filters,
    total: search.total,
    items: search.items,
    relaxedFilters: search.relaxedFilters,
    warnings: extracted.warnings,
    message:
      search.total > 0
        ? `Found ${search.total} verified platform listing${search.total === 1 ? "" : "s"}. Use only these items for Cheque & Key facts.`
        : "No matching verified Cheque & Key platform listings were found after broadening safe filters. If useful, call search_external_market next."
  };
}

function getGroundingSources(response: unknown): LiveExternalSource[] {
  const candidate = (response as { candidates?: Array<Record<string, unknown>> }).candidates?.[0];
  const metadata = (candidate?.groundingMetadata ?? candidate?.grounding_metadata) as
    | { groundingChunks?: Array<Record<string, unknown>> }
    | undefined;
  const chunks = metadata?.groundingChunks ?? [];
  const sources = chunks
    .map((chunk) => {
      const web = chunk.web as { title?: unknown; uri?: unknown } | undefined;
      const title = typeof web?.title === "string" ? web.title : "";
      const uri = typeof web?.uri === "string" ? web.uri : "";
      return title && uri ? { title, uri } : null;
    })
    .filter((source): source is LiveExternalSource => Boolean(source));

  return Array.from(new Map(sources.map((source) => [source.uri, source])).values()).slice(0, 5);
}

function buildExternalResearchInstruction(language: AiLanguage) {
  const languageRule =
    language === "AR"
      ? "Write user-facing findings in Arabic script. Keep source titles, project names, and place names as supplied by sources."
      : "Write user-facing findings in natural English.";

  return [
    "You are a cautious web research helper for a real estate voice assistant.",
    "Search public real estate portals, developer inventory pages, and official listing pages for source-backed off-platform data.",
    "Favor sources that match the user's location, budget, deal type, property type, project, or unit code.",
    "If sources are broad search/result pages instead of concrete listings, say that clearly.",
    "Do not invent exact prices, availability, seller names, phone numbers, booking options, or links.",
    "Keep the answer concise enough to be spoken aloud.",
    languageRule
  ].join("\n");
}

function buildExternalResearchPrompt(query: string, language: AiLanguage) {
  return JSON.stringify(
    {
      task: "Search the web because the user requested off-platform real estate options or the platform search returned no verified matches.",
      userMessage: query,
      requestedLanguage: language,
      requirements: [
        "Return 3 to 5 short findings when enough grounded information exists.",
        "For each useful lead, include the source/site name and source-backed facts such as project, area, rough price text, property type, or page purpose.",
        "Say that these are external/off-platform sources and not verified Cheque & Key listings.",
        "Do not include raw long URLs in the prose because links are rendered separately in the UI."
      ]
    },
    null,
    2
  );
}

export async function searchLiveExternalMarket(query: string, language: AiLanguage): Promise<LiveExternalMarketOutput> {
  const { response, model } = await generateExternalContentWithFallback({
    label: "Gemini Live external market search",
    buildRequest: (candidateModel) => ({
      model: candidateModel,
      contents: buildExternalResearchPrompt(query, language),
      config: {
        systemInstruction: buildExternalResearchInstruction(language),
        tools: [{ googleSearch: {} }]
      }
    })
  });

  const text = response.text?.trim() || "";
  const sources = getGroundingSources(response);

  return {
    kind: "external_market",
    query,
    text,
    sources,
    model,
    message:
      text.length > 0
        ? "External off-platform research completed. Clearly tell the user it is not verified Cheque & Key inventory and mention that links are shown on screen."
        : "External search completed but did not return enough grounded text. Ask the user to broaden or clarify the external search."
  };
}

export function buildLiveAssistantSystemInstruction(language: AiLanguage) {
  const languageRule =
    language === "AR"
      ? "Speak Arabic when the user speaks Arabic. Keep project names, unit codes, and place names exactly as returned by tools."
      : "Speak natural English unless the user clearly speaks another language.";

  return [
    "You are Cheque & Key's live real estate voice assistant.",
    "Keep spoken answers friendly, concise, and useful. Use short sentences that sound natural aloud.",
    "For property search, listing, recommendation, comparison, price, availability, payment, location, or 360-tour requests, your next response must be a function call, not a spoken answer.",
    "For any Cheque & Key property recommendation, price, availability, location, payment plan, 360 tour, or comparison, call search_platform_properties first.",
    "Use platform tool results as the only source of truth for verified Cheque & Key listings.",
    "Never answer property requests from memory. Never invent platform properties, prices, projects, seller names, availability, or 360 tour status.",
    "If platform results are broadened, briefly say which constraints were relaxed.",
    "If platform results are empty and the user asked for off-platform, online, outside-website, external, market, or alternative options, call search_external_market.",
    "If platform results are empty and the user's criteria are specific, you may call search_external_market and clearly say the findings are off-platform and not verified by Cheque & Key.",
    "When external sources are used, do not read raw URLs aloud. Say that links are shown in the chat.",
    "If the request is vague, ask one focused follow-up question instead of guessing.",
    languageRule
  ].join("\n");
}

export function buildLiveConnectConfig(language: AiLanguage, voiceName = getGeminiLiveVoice()): LiveConnectConfig {
  return {
    responseModalities: AUDIO_RESPONSE_MODALITIES,
    temperature: 0.35,
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName }
      }
    },
    systemInstruction: buildLiveAssistantSystemInstruction(language),
    tools: [
      {
        functionDeclarations: [platformSearchDeclaration, externalMarketDeclaration]
      }
    ],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: true
      }
    }
  };
}

export async function createLiveEphemeralSession(language: AiLanguage) {
  const model = getGeminiLiveModel();
  const voiceName = getGeminiLiveVoice();
  const config = buildLiveConnectConfig(language, voiceName);
  const now = Date.now();
  const expiresAt = new Date(now + getGeminiLiveTokenMinutes() * 60_000).toISOString();
  const newSessionExpiresAt = new Date(now + 60_000).toISOString();

  const token = await getLiveAuthClient().authTokens.create({
    config: {
      uses: 1,
      expireTime: expiresAt,
      newSessionExpireTime: newSessionExpiresAt,
      liveConnectConstraints: {
        model,
        config
      },
      httpOptions: {
        apiVersion: "v1alpha"
      }
    }
  });

  if (!token.name) throw new Error("Gemini did not return a Live API auth token.");

  return {
    token: token.name,
    model,
    config,
    voiceName,
    expiresAt,
    newSessionExpiresAt
  };
}

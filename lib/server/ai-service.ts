import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { aiChatRequestSchema, type AiLanguage, type AiPropertySearchFilters } from "../ai-contract.ts";
import type { PublicPropertyCard } from "../types.ts";
import { searchAiReadableProperties } from "../repository.ts";
import {
  buildHistoryFilters,
  buildSuggestedFilterKeys,
  extractAiFilters,
  hasMeaningfulFilters,
  isComparisonRequest,
  isContextFollowup,
  isGreeting,
  isSearchableFilterSet,
  mergeAiFilters,
  relaxAiFilters,
  shouldForceGroundedSearch,
  shouldUseExternalResearch
} from "./ai-filters.ts";
import { getAiTimeoutMs, getGeminiApiKey, getGeminiModelCandidates, getGeminiStatus } from "./ai-config.ts";

type AiIntent = "GREETING" | "CLARIFY" | "SEARCH_RESULTS" | "NO_RESULTS" | "COMPARE" | "GUIDANCE";

type GroundedPropertyItem = {
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
};

type GeminiFinalPayload = {
  reply: string;
  intent: AiIntent;
  clarifyingQuestion: string | null;
  suggestions: string[];
};

type ExternalSource = {
  title: string;
  uri: string;
};

type ExternalResearchMode = "MARKET_CONTEXT" | "NO_LOCAL_RESULTS";

type ExternalResearchContext = {
  mode: ExternalResearchMode;
  text: string;
  sources: ExternalSource[];
  model: string;
};

const FINAL_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: {
      type: "string",
      description: "The natural-language answer shown to the user."
    },
    intent: {
      type: "string",
      enum: ["GREETING", "CLARIFY", "SEARCH_RESULTS", "NO_RESULTS", "COMPARE", "GUIDANCE"]
    },
    clarifyingQuestion: {
      type: ["string", "null"],
      description: "A focused follow-up question when needed, otherwise null."
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
      description: "Two or three short user prompts that can be sent next."
    }
  },
  required: ["reply", "intent", "clarifyingQuestion", "suggestions"]
} as const;

let geminiClient: GoogleGenAI | null = null;
type GeminiGenerateContentRequest = Parameters<ReturnType<typeof getGeminiClient>["models"]["generateContent"]>[0];

function getGeminiClient() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  if (!geminiClient) geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
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

function isGeminiRateLimitError(error: unknown) {
  const details = summarizeError(error).toLowerCase();
  return (
    details.includes("resource_exhausted") ||
    details.includes("\"code\":429") ||
    details.includes("code 429") ||
    details.includes("too many requests") ||
    details.includes("quota exceeded") ||
    details.includes("rate limit")
  );
}

async function generateContentWithModelFallback(input: {
  label: string;
  traceId: string;
  buildRequest: (model: string) => GeminiGenerateContentRequest;
}) {
  const ai = getGeminiClient();
  const models = getGeminiModelCandidates();
  let lastError: unknown = null;

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index]!;

    try {
      const response = await withTimeout(
        ai.models.generateContent(input.buildRequest(model)),
        getAiTimeoutMs(),
        `${input.label} (${model})`
      );

      if (index > 0 && process.env.NODE_ENV !== "production") {
        console.info(`[AI Chat][${input.traceId}] ${input.label} used fallback model`, {
          model,
          skippedModels: models.slice(0, index)
        });
      }

      return { response, model };
    } catch (error) {
      lastError = error;
      const nextModel = models[index + 1];
      if (!nextModel || !isGeminiRateLimitError(error)) throw error;

      if (process.env.NODE_ENV !== "production") {
        console.warn(`[AI Chat][${input.traceId}] ${input.label} rate-limited; retrying fallback model`, {
          model,
          nextModel,
          error: summarizeError(error)
        });
      }
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

function toGroundedItems(items: PublicPropertyCard[]): GroundedPropertyItem[] {
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
    verified: Boolean(item.verified)
  }));
}

function sanitizeSuggestions(values: unknown, language: AiLanguage, intent: AiIntent, filters: AiPropertySearchFilters, items: GroundedPropertyItem[]) {
  const raw = Array.isArray(values) ? values : [];
  const cleaned = raw
    .map((value) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""))
    .filter(Boolean)
    .filter((value) => !value.includes("_"))
    .filter((value) => !/schedule a viewing/i.test(value))
    .slice(0, 3);

  if (cleaned.length > 0) return Array.from(new Set(cleaned)).slice(0, 3);
  return buildDefaultSuggestions(language, intent, filters, items);
}

function buildDefaultSuggestions(language: AiLanguage, intent: AiIntent, filters: AiPropertySearchFilters, items: GroundedPropertyItem[]) {
  const location = filters.district || filters.area || filters.city || (language === "AR" ? "نفس المنطقة" : "the same area");

  if (language === "AR") {
    if (intent === "COMPARE" || items.length >= 2) {
      return ["قارن بين أول عقارين", "اعرض خيارات أرخص", `ابحث عن عقارات مشابهة في ${location}`];
    }
    if (items.length > 0) return ["اعرض تفاصيل أكثر", "اعرض خيارات أرخص", `ابحث عن عقارات مشابهة في ${location}`];
    return ["شقة في القاهرة الجديدة أقل من 5 مليون", "فيلا للإيجار في المعادي", "قارن بين أفضل عقارين"];
  }

  if (intent === "COMPARE" || items.length >= 2) {
    return ["Compare the top two", "Show cheaper options", `Find similar listings in ${location}`];
  }
  if (items.length > 0) return ["Show more details", "Show cheaper options", `Find similar listings in ${location}`];
  return ["Apartment in New Cairo under 5M", "Rent villa in Maadi", "Compare the best two matches"];
}

function parseGeminiJson(text: string): GeminiFinalPayload {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Partial<GeminiFinalPayload>;
  return {
    reply: typeof parsed.reply === "string" ? parsed.reply.trim() : "",
    intent: isValidIntent(parsed.intent) ? parsed.intent : "GUIDANCE",
    clarifyingQuestion: typeof parsed.clarifyingQuestion === "string" ? parsed.clarifyingQuestion.trim() || null : null,
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((item): item is string => typeof item === "string") : []
  };
}

function isValidIntent(value: unknown): value is AiIntent {
  return (
    value === "GREETING" ||
    value === "CLARIFY" ||
    value === "SEARCH_RESULTS" ||
    value === "NO_RESULTS" ||
    value === "COMPARE" ||
    value === "GUIDANCE"
  );
}

function buildSystemInstruction(language: AiLanguage) {
  const languageRule =
    language === "AR"
      ? "Answer in Arabic script only for user-facing text. Keep property titles, project names, unit codes, and place names exactly as supplied."
      : "Answer in natural English only for user-facing text.";

  return [
    "You are Cheque & Key's production real estate assistant.",
    "You help users search, compare, and reason about verified property listings.",
    "Use returnedItems as the only source of truth for verified Cheque & Key platform listing facts such as prices, payment plans, locations, availability, and seller names.",
    "Never invent properties, prices, projects, phone numbers, or availability.",
    "Use has360View, hasPanorama360, and hasSpin360 from returnedItems as the only source of truth for 360 tour availability.",
    "If results were broadened, explicitly say they are broadened alternatives and name the relaxed constraints.",
    "If the user asks to compare, compare the best supplied items on price, area, bedrooms, payment type, location, 360 tour availability, and tradeoffs.",
    "If externalResearch.mode is MARKET_CONTEXT, keep it clearly separate from platform listing facts.",
    "If externalResearch.mode is NO_LOCAL_RESULTS and returnedItems is empty, you may summarize external/off-platform research, but clearly say it is outside Cheque & Key and not platform-verified.",
    "Never present external research as returnedItems, verified listings, or bookable platform inventory.",
    "Do not offer unsupported actions. Keep the answer concise, practical, and conversational.",
    languageRule
  ].join("\n");
}

function buildGeminiPrompt(input: {
  message: string;
  language: AiLanguage;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  filters: AiPropertySearchFilters;
  warnings: string[];
  intent: AiIntent;
  total: number;
  items: GroundedPropertyItem[];
  relaxedFilters: string[];
  externalResearch: ExternalResearchContext | null;
}) {
  return JSON.stringify(
    {
      task: "Write the final assistant response as JSON matching the configured schema.",
      userMessage: input.message,
      requestedLanguage: input.language,
      recentHistory: input.history.slice(-8),
      detectedIntent: input.intent,
      extractedFilters: input.filters,
      extractionWarnings: input.warnings,
      search: {
        total: input.total,
        returnedItems: input.items,
        relaxedFilters: input.relaxedFilters
      },
      externalResearch: input.externalResearch,
      responseRequirements: [
        "reply must be useful as a chat answer.",
        "suggestions must be short prompts the user can click/send next.",
        "If returnedItems is empty and the request is vague, ask one focused clarification question.",
        "If returnedItems has data, mention actual item names and exact values from returnedItems.",
        "If returnedItems is empty and externalResearch.mode is NO_LOCAL_RESULTS, say no verified Cheque & Key matches were found, then summarize useful external/off-platform findings with source names.",
        "If externalResearch has sources, keep source-backed claims cautious and avoid unsupported exact availability/contact details.",
        "If the user asks about 360 tours, only recommend returnedItems where has360View is true.",
        "If comparing, produce a clear recommendation with tradeoffs."
      ]
    },
    null,
    2
  );
}

function currentPrice(item: GroundedPropertyItem) {
  return item.transaction === "RENT" ? item.rentPrice : item.price;
}

function formatFallbackPrice(item: GroundedPropertyItem, language: AiLanguage) {
  const price = currentPrice(item);
  if (typeof price !== "number") return language === "AR" ? "السعر عند الطلب" : "price on request";
  return new Intl.NumberFormat(language === "AR" ? "ar-EG" : "en-US", {
    style: "currency",
    currency: item.currency || "EGP",
    maximumFractionDigits: 0
  }).format(price);
}

function formatFallback360Tag(item: GroundedPropertyItem, language: AiLanguage) {
  if (!item.has360View) return "";
  return language === "AR" ? " - \u0639\u0631\u0636 360" : " - 360 view";
}

function buildTransparentFallback(input: {
  language: AiLanguage;
  intent: AiIntent;
  filters: AiPropertySearchFilters;
  total: number;
  items: GroundedPropertyItem[];
  relaxedFilters: string[];
}) {
  const suggestions = buildDefaultSuggestions(input.language, input.intent, input.filters, input.items);
  if (input.intent === "GREETING" && input.items.length === 0) {
    return {
      reply:
        input.language === "AR"
          ? "\u0623\u0647\u0644\u0627! \u0623\u0642\u062f\u0631 \u0623\u0633\u0627\u0639\u062f\u0643 \u0641\u064a \u0627\u0644\u0628\u062d\u062b \u0639\u0646 \u0639\u0642\u0627\u0631\u0627\u062a \u0645\u0648\u062b\u0642\u0629\u060c \u0645\u0642\u0627\u0631\u0646\u0629 \u0627\u0644\u062e\u064a\u0627\u0631\u0627\u062a\u060c \u0648\u062a\u0636\u064a\u064a\u0642 \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u062d\u0633\u0628 \u0627\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0648\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0648\u062e\u0637\u0629 \u0627\u0644\u062f\u0641\u0639. \u0646\u0628\u062f\u0623 \u0628\u0623\u064a \u0645\u062f\u064a\u0646\u0629 \u0623\u0648 \u0645\u064a\u0632\u0627\u0646\u064a\u0629\u061f"
          : "Hi! I can help you search verified properties, compare options, and narrow choices by budget, area, and payment plan. What city or budget should we start with?",
      suggestions
    };
  }
  if (input.language === "AR") {
    if (input.items.length === 0) {
      return {
        reply: "\u0644\u0645 \u0623\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0645\u0637\u0627\u0628\u0642\u0629 \u0641\u064a \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629. \u062c\u0631\u0651\u0628 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0623\u0648 \u0627\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0623\u0648 \u0646\u0648\u0639 \u0627\u0644\u0639\u0642\u0627\u0631.",
        suggestions
      };
    }
    const lines = input.items
      .slice(0, 3)
      .map((item, index) => `${index + 1}. ${item.title} - ${formatFallbackPrice(item, input.language)} - ${[item.district, item.area, item.city].filter(Boolean).join(", ")}${formatFallback360Tag(item, input.language)}`);
    return {
      reply: `\u0647\u0630\u0647 \u0623\u0641\u0636\u0644 \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0645\u0646 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629:\n${lines.join("\n")}`,
      suggestions
    };
  }

  if (input.items.length === 0) {
    return {
      reply: "I did not find matching platform listings yet. Try adding a location, budget, or property type.",
      suggestions
    };
  }
  const lines = input.items
    .slice(0, 3)
    .map((item, index) => `${index + 1}. ${item.title} - ${formatFallbackPrice(item, input.language)} - ${[item.district, item.area, item.city].filter(Boolean).join(", ")}${formatFallback360Tag(item, input.language)}`);
  return {
    reply: `Here are the best matching listings from the platform:\n${lines.join("\n")}`,
    suggestions
  };
}

function buildExternalResearchFallback(language: AiLanguage, externalResearch: ExternalResearchContext | null) {
  if (!externalResearch?.text.trim()) return "";
  const cleaned = externalResearch.text.trim().replace(/\n{3,}/g, "\n\n").slice(0, 1800);

  if (externalResearch.mode === "NO_LOCAL_RESULTS") {
    return language === "AR"
      ? `\u0644\u0645 \u0623\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0645\u0648\u062b\u0642\u0629 \u0645\u0637\u0627\u0628\u0642\u0629 \u062f\u0627\u062e\u0644 Cheque & Key. \u0628\u062d\u062b\u062a \u0641\u064a \u0645\u0635\u0627\u062f\u0631 \u062e\u0627\u0631\u062c\u064a\u0629\u060c \u0648\u0647\u0630\u0647 \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u063a\u064a\u0631 \u0645\u0648\u062b\u0642\u0629 \u0645\u0646 \u0627\u0644\u0645\u0646\u0635\u0629:\n${cleaned}`
      : `I did not find matching verified listings inside Cheque & Key. I searched external sources, so treat these as off-platform and not platform-verified:\n${cleaned}`;
  }

  return cleaned;
}

function buildExternalResearchUnavailableReply(language: AiLanguage, reason: string | null) {
  const suffix =
    reason && process.env.NODE_ENV !== "production"
      ? language === "AR"
        ? `\n\u0627\u0644\u0633\u0628\u0628 \u0627\u0644\u062a\u0642\u0646\u064a: ${reason}`
        : `\nTechnical reason: ${reason}`
      : "";

  return language === "AR"
    ? `\u0644\u0645 \u0623\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0645\u0648\u062b\u0642\u0629 \u0645\u0637\u0627\u0628\u0642\u0629 \u062f\u0627\u062e\u0644 Cheque & Key. \u062d\u0627\u0648\u0644\u062a \u0627\u0644\u0628\u062d\u062b \u0641\u064a \u0645\u0635\u0627\u062f\u0631 \u062e\u0627\u0631\u062c\u064a\u0629\u060c \u0644\u0643\u0646 \u0628\u062d\u062b \u0627\u0644\u0648\u064a\u0628 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d \u062d\u0627\u0644\u064a\u064b\u0627. \u062c\u0631\u0651\u0628 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649 \u0623\u0648 \u0648\u0633\u0651\u0639 \u0627\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0623\u0648 \u0627\u0644\u0645\u0646\u0637\u0642\u0629.${suffix}`
    : `I did not find matching verified listings inside Cheque & Key. I tried searching external sources too, but web search is unavailable right now. Try again later, or broaden the budget/location and I can search the platform again.${suffix}`;
}

function getGroundingSources(response: unknown): ExternalSource[] {
  const candidate = (response as { candidates?: Array<Record<string, unknown>> }).candidates?.[0];
  const metadata = (candidate?.groundingMetadata ?? candidate?.grounding_metadata) as { groundingChunks?: Array<Record<string, unknown>> } | undefined;
  const chunks = metadata?.groundingChunks ?? [];
  const sources = chunks
    .map((chunk) => {
      const web = chunk.web as { title?: unknown; uri?: unknown } | undefined;
      const title = typeof web?.title === "string" ? web.title : "";
      const uri = typeof web?.uri === "string" ? web.uri : "";
      return title && uri ? { title, uri } : null;
    })
    .filter((source): source is ExternalSource => Boolean(source));

  return Array.from(new Map(sources.map((source) => [source.uri, source])).values()).slice(0, 5);
}

function shouldUseNoLocalResultsExternalSearch(input: {
  shouldSearch: boolean;
  message: string;
  filters: AiPropertySearchFilters;
  total: number;
  items: GroundedPropertyItem[];
}) {
  return (
    input.shouldSearch &&
    input.total === 0 &&
    input.items.length === 0 &&
    hasMeaningfulFilters(input.filters) &&
    !isGreeting(input.message)
  );
}

function buildExternalResearchInstruction(language: AiLanguage, mode: ExternalResearchMode) {
  const languageRule =
    language === "AR"
      ? "Write user-facing research text in Arabic script. Keep source titles, project names, and place names as supplied by sources."
      : "Write user-facing research text in natural English.";

  const modeRule =
    mode === "NO_LOCAL_RESULTS"
      ? [
          "The platform database has no verified matches for this user request.",
          "Search public real estate portals, developer inventory pages, and official listing pages for relevant off-platform data.",
          "Favor sources that match the requested location, budget, deal type, property type, project, or unit code.",
          "If sources are broad search/result pages instead of concrete listings, say that clearly.",
          "Do not invent exact prices, availability, seller names, phone numbers, or booking options."
        ]
      : [
          "Search for concise external real estate market context relevant to the user request.",
          "Do not discuss Cheque & Key platform inventory."
        ];

  return [
    "You are a cautious web research helper for a real estate assistant.",
    ...modeRule,
    "Use only search-grounded information and keep unsupported claims out of the answer.",
    languageRule
  ].join("\n");
}

function buildExternalResearchPrompt(input: {
  message: string;
  language: AiLanguage;
  filters: AiPropertySearchFilters;
  mode: ExternalResearchMode;
}) {
  const noLocalResultsRequirements = [
    "Start from the exact user need and extractedFilters.",
    "Look for off-platform real estate matches or the most relevant external places to continue the search.",
    "Return 3 to 5 short bullets when enough grounded information exists.",
    "For each useful lead, include the source/site name and only source-backed facts such as project, area, rough price text, unit type, or page purpose.",
    "Say that these are external/off-platform sources and not verified Cheque & Key listings."
  ];

  const marketRequirements = [
    "Return concise market context that helps the user evaluate the platform results.",
    "Keep external context separate from platform inventory.",
    "Mention source/site names for important claims."
  ];

  return JSON.stringify(
    {
      task:
        input.mode === "NO_LOCAL_RESULTS"
          ? "Search the web because the platform database returned zero verified matches."
          : "Search the web for external market context.",
      mode: input.mode,
      userMessage: input.message,
      requestedLanguage: input.language,
      extractedFilters: input.filters,
      localPlatformSearch:
        input.mode === "NO_LOCAL_RESULTS"
          ? "zero verified matches after local search and relaxation"
          : "external context requested by the user",
      requirements: input.mode === "NO_LOCAL_RESULTS" ? noLocalResultsRequirements : marketRequirements
    },
    null,
    2
  );
}

async function getExternalResearch(input: {
  message: string;
  language: AiLanguage;
  traceId: string;
  filters: AiPropertySearchFilters;
  useNoLocalResultsFallback: boolean;
}): Promise<ExternalResearchContext | null> {
  const explicitExternalRequest = shouldUseExternalResearch(input.message);
  const mode: ExternalResearchMode | null = input.useNoLocalResultsFallback
    ? "NO_LOCAL_RESULTS"
    : explicitExternalRequest
      ? "MARKET_CONTEXT"
      : null;

  if (!mode) return null;

  const { response, model } = await generateContentWithModelFallback({
    label: "Gemini Google Search grounding",
    traceId: input.traceId,
    buildRequest: (candidateModel) => ({
      model: candidateModel,
      contents: buildExternalResearchPrompt({
        message: input.message,
        language: input.language,
        filters: input.filters,
        mode
      }),
      config: {
        systemInstruction: buildExternalResearchInstruction(input.language, mode),
        tools: [{ googleSearch: {} }]
      }
    })
  });

  const text = response.text?.trim() || "";
  if (process.env.NODE_ENV !== "production") {
    console.info(`[AI Chat][${input.traceId}] external research`, {
      mode,
      used: Boolean(text),
      model,
      sources: getGroundingSources(response).length
    });
  }

  return text ? { mode, text, sources: getGroundingSources(response), model } : null;
}

async function runSearchWithRelaxation(filters: AiPropertySearchFilters, traceId: string) {
  let currentFilters = filters;
  let result = await searchAiReadableProperties(currentFilters);
  let items = toGroundedItems(result.items);
  const relaxedFilters: string[] = [];

  if (process.env.NODE_ENV !== "production") {
    console.info(`[AI Chat][${traceId}] search result`, {
      filters: currentFilters,
      total: result.total,
      itemIds: items.map((item) => item.id)
    });
  }

  for (let relaxCount = 0; result.total === 0 && relaxCount < 6; relaxCount += 1) {
    const relaxed = relaxAiFilters(currentFilters, relaxedFilters);
    if (relaxed.relaxedKeys.length === 0) break;
    currentFilters = relaxed.filters;
    relaxedFilters.push(...relaxed.relaxedKeys);
    result = await searchAiReadableProperties(currentFilters);
    items = toGroundedItems(result.items);
  }

  return {
    filters: currentFilters,
    total: result.total,
    items,
    relaxedFilters: Array.from(new Set(relaxedFilters))
  };
}

function inferIntent(message: string, filters: AiPropertySearchFilters, total: number, items: GroundedPropertyItem[]): AiIntent {
  if (isGreeting(message)) return "GREETING";
  if (isComparisonRequest(message) || (isContextFollowup(message) && items.length >= 2 && /compare/i.test(message))) return "COMPARE";
  if (total > 0) return "SEARCH_RESULTS";
  if (hasMeaningfulFilters(filters) && total === 0) return "NO_RESULTS";
  return "CLARIFY";
}

async function buildChatPayload(rawBody: unknown, traceId: string) {
  const parsed = aiChatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      response: NextResponse.json(
        {
          error: "Invalid chat payload.",
          issues: parsed.error.flatten()
        },
        { status: 400 }
      )
    };
  }

  const request = parsed.data;
  const language = request.language ?? "EN";
  const history = request.history ?? [];
  const gemini = getGeminiStatus();

  const extracted = extractAiFilters(request.message);
  const priorFilters = buildHistoryFilters(history);
  const filters = isContextFollowup(request.message) && hasMeaningfulFilters(priorFilters)
    ? priorFilters
    : mergeAiFilters(extracted.filters, priorFilters);

  const shouldSearch = shouldForceGroundedSearch(filters) || isSearchableFilterSet(filters) || isComparisonRequest(request.message);
  let search = {
    filters,
    total: 0,
    items: [] as GroundedPropertyItem[],
    relaxedFilters: [] as string[]
  };

  if (shouldSearch && !isGreeting(request.message)) {
    search = await runSearchWithRelaxation(filters, traceId);
  }

  const intent = inferIntent(request.message, search.filters, search.total, search.items);
  const suggestedFilters = buildSuggestedFilterKeys(search.filters);
  const useNoLocalResultsFallback = shouldUseNoLocalResultsExternalSearch({
    shouldSearch,
    message: request.message,
    filters: search.filters,
    total: search.total,
    items: search.items
  });
  let externalResearchError: string | null = null;
  const externalResearch = gemini.configured
    ? await getExternalResearch({
        message: request.message,
        language,
        traceId,
        filters: search.filters,
        useNoLocalResultsFallback
      }).catch((error) => {
        externalResearchError = summarizeError(error);
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[AI Chat][${traceId}] external research skipped`, externalResearchError);
        }
        return null;
      })
    : null;
  const externalResearchUnavailable =
    useNoLocalResultsFallback && !externalResearch && Boolean(externalResearchError);

  if (!gemini.configured) {
    const fallback = buildTransparentFallback({
      language,
      intent,
      filters: search.filters,
      total: search.total,
      items: search.items,
      relaxedFilters: search.relaxedFilters
    });
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[AI Chat][${traceId}] Gemini is not configured; using DB-grounded fallback.`);
    }
    return {
      response: NextResponse.json({
        reply: fallback.reply,
        language,
        intent,
        shouldSearch,
        clarifyingQuestion: null,
        suggestions: fallback.suggestions,
        suggestedFilters,
        extractedFilters: search.filters,
        relaxedFilters: search.relaxedFilters,
        total: search.total,
        items: search.items,
        externalSources: [],
        externalResearchMode: null,
        externalResearchError: null,
        externalResearchModel: null,
        aiModel: null,
        aiProviderConfigured: false
      })
    };
  }

  try {
    const { response, model } = await generateContentWithModelFallback({
      label: "Gemini chat generation",
      traceId,
      buildRequest: (candidateModel) => ({
        model: candidateModel,
        contents: buildGeminiPrompt({
          message: request.message,
          language,
          history,
          filters: search.filters,
          warnings: extracted.warnings,
          intent,
          total: search.total,
          items: search.items,
          relaxedFilters: search.relaxedFilters,
          externalResearch
        }),
        config: {
          systemInstruction: buildSystemInstruction(language),
          responseMimeType: "application/json",
          responseJsonSchema: FINAL_RESPONSE_SCHEMA,
          temperature: 0.35
        }
      })
    });

    const finalPayload = parseGeminiJson(response.text ?? "");
    const finalIntent =
      intent === "GREETING"
        ? "GREETING"
        : isComparisonRequest(request.message) && search.items.length >= 2
          ? "COMPARE"
          : finalPayload.intent || intent;
    const reply =
      (externalResearchUnavailable ? buildExternalResearchUnavailableReply(language, externalResearchError) : "") ||
      finalPayload.reply ||
      buildExternalResearchFallback(language, externalResearch) ||
      buildTransparentFallback({
        language,
        intent: finalIntent,
        filters: search.filters,
        total: search.total,
        items: search.items,
        relaxedFilters: search.relaxedFilters
      }).reply;

    return {
      response: NextResponse.json({
        reply,
        language,
        intent: finalIntent,
        shouldSearch,
        clarifyingQuestion: finalPayload.clarifyingQuestion,
        suggestions: sanitizeSuggestions(finalPayload.suggestions, language, finalIntent, search.filters, search.items),
        suggestedFilters,
        extractedFilters: search.filters,
        relaxedFilters: search.relaxedFilters,
        total: search.total,
        items: search.items,
        externalSources: externalResearch?.sources ?? [],
        externalResearchMode: externalResearch?.mode ?? (useNoLocalResultsFallback ? "NO_LOCAL_RESULTS" : null),
        externalResearchError,
        externalResearchModel: externalResearch?.model ?? null,
        aiModel: model
      })
    };
  } catch (error) {
    const fallback = buildTransparentFallback({
      language,
      intent,
      filters: search.filters,
      total: search.total,
      items: search.items,
      relaxedFilters: search.relaxedFilters
    });
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[AI Chat][${traceId}] Gemini fallback`, error instanceof Error ? error.message : error);
    }
    return {
      response: NextResponse.json({
        reply:
          (externalResearchUnavailable ? buildExternalResearchUnavailableReply(language, externalResearchError) : "") ||
          buildExternalResearchFallback(language, externalResearch) ||
          fallback.reply,
        language,
        intent,
        shouldSearch,
        clarifyingQuestion: null,
        suggestions: fallback.suggestions,
        suggestedFilters,
        extractedFilters: search.filters,
        relaxedFilters: search.relaxedFilters,
        total: search.total,
        items: search.items,
        externalSources: externalResearch?.sources ?? [],
        externalResearchMode: externalResearch?.mode ?? (useNoLocalResultsFallback ? "NO_LOCAL_RESULTS" : null),
        externalResearchError,
        externalResearchModel: externalResearch?.model ?? null,
        aiModel: null
      })
    };
  }
}

export async function handleAiChatRequest(rawBody: unknown, traceId?: string) {
  const requestTraceId = traceId?.trim() || `chat-${Date.now()}`;

  if (process.env.NODE_ENV !== "production") {
    console.info(`[AI Chat][${requestTraceId}] incoming`, rawBody);
  }

  try {
    const result = await buildChatPayload(rawBody, requestTraceId);
    return result.response;
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown AI service error.";
    if (process.env.NODE_ENV !== "production") {
      console.error(`[AI Chat][${requestTraceId}] failure`, details);
    }
    return NextResponse.json(
      {
        error: "AI service request failed.",
        details
      },
      { status: 500 }
    );
  }
}

export const proxyAiChatRequest = handleAiChatRequest;

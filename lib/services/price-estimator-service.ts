import { GoogleGenAI } from "@google/genai";
import { normalizeLanguage, t, type Language } from "../i18n.ts";
import { getAiTimeoutMs, getGeminiApiKey, getGeminiModelCandidates } from "../server/ai-config.ts";
import { prisma } from "../server/prisma.ts";

export type PriceEstimateInput = {
  userId?: string | null;
  language?: Language | string | null;
  propertyType: string;
  city: string;
  area?: string | null;
  district?: string | null;
  areaSqm: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  furnishing?: string | null;
  completionStatus?: string | null;
  paymentType?: string | null;
};

export type PriceEstimateResult =
  | {
      ok: true;
      estimate: {
        id: string;
        estimatedPrice: number;
        minPrice: number;
        maxPrice: number;
        confidenceScore: number;
        explanation: string;
        comparableCount: number;
        basedOn: "similar_properties" | "city_type_average" | "ai_market_guidance";
        createdAt: string;
      };
    }
  | {
      ok: false;
      message: string;
    };

type ComparableProperty = {
  id: string;
  price: number | null;
  pricePerSqm: number | null;
  areaSqm: number;
  bedrooms: number;
  bathrooms: number;
  furnishing: string;
  paymentType: string;
  completionStatus: string;
};

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  if (!geminiClient) geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`Gemini timed out after ${timeoutMs}ms.`)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function cleanText(value?: string | null) {
  return String(value ?? "").trim();
}

function cleanOptionalText(value?: string | null) {
  const cleaned = cleanText(value);
  return cleaned.length > 0 ? cleaned : null;
}

function roundMoney(value: number) {
  return Math.round(value / 1000) * 1000;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function pricePerSqm(property: ComparableProperty) {
  if (property.pricePerSqm && property.pricePerSqm > 0) return property.pricePerSqm;
  if (!property.price || property.price <= 0 || property.areaSqm <= 0) return null;
  return property.price / property.areaSqm;
}

function optionMultiplier(input: PriceEstimateInput) {
  let multiplier = 1;

  if (input.furnishing === "FULLY") multiplier += 0.06;
  if (input.furnishing === "SEMI") multiplier += 0.03;
  if (input.furnishing === "UNFURNISHED") multiplier -= 0.02;

  if (input.completionStatus === "READY") multiplier += 0.04;
  if (input.completionStatus === "OFF_PLAN") multiplier -= 0.03;

  if (input.paymentType === "INSTALLMENTS") multiplier += 0.02;

  return multiplier;
}

function roomAdjustment(input: PriceEstimateInput, comparables: ComparableProperty[]) {
  let adjustment = 0;
  if (input.bedrooms != null) {
    const avgBeds = average(comparables.map((item) => item.bedrooms));
    adjustment += (input.bedrooms - avgBeds) * 0.025;
  }
  if (input.bathrooms != null) {
    const avgBaths = average(comparables.map((item) => item.bathrooms));
    adjustment += (input.bathrooms - avgBaths) * 0.018;
  }
  return Math.min(0.18, Math.max(-0.18, adjustment));
}

function confidenceScore(input: PriceEstimateInput, comparables: ComparableProperty[], basedOn: "similar_properties" | "city_type_average") {
  let score = basedOn === "similar_properties" ? 0.62 : 0.42;
  score += Math.min(0.22, comparables.length * 0.025);
  if (cleanOptionalText(input.area) || cleanOptionalText(input.district)) score += 0.06;
  if (input.bedrooms != null) score += 0.03;
  if (input.bathrooms != null) score += 0.03;
  return Math.min(0.92, Math.max(0.35, score));
}

function localGuidanceEstimate(input: PriceEstimateInput) {
  const language = normalizeLanguage(input.language);
  const type = cleanText(input.propertyType).toUpperCase();
  const city = cleanText(input.city).toLowerCase();
  const area = cleanText(input.area || input.district).toLowerCase();
  let basePerSqm = 28000;

  if (city.includes("new cairo") || city.includes("tagamo") || city.includes("fifth")) basePerSqm = 42000;
  if (city.includes("sheikh zayed") || city.includes("zayed") || city.includes("october")) basePerSqm = 36000;
  if (city.includes("maadi")) basePerSqm = 38000;
  if (city.includes("nasr")) basePerSqm = 30000;
  if (city.includes("alex")) basePerSqm = 26000;
  if (area.includes("fifth") || area.includes("north investors") || area.includes("golden square")) basePerSqm *= 1.12;

  if (type === "VILLA") basePerSqm *= 1.35;
  if (type === "DUPLEX" || type === "PENTHOUSE") basePerSqm *= 1.18;
  if (type === "CHALET") basePerSqm *= 1.08;
  if (type === "LAND") basePerSqm *= 0.75;
  if (type === "COMMERCIAL") basePerSqm *= 1.45;

  const estimatedPrice = roundMoney(basePerSqm * input.areaSqm * optionMultiplier(input));
  return {
    estimatedPrice,
    minPrice: roundMoney(estimatedPrice * 0.78),
    maxPrice: roundMoney(estimatedPrice * 1.22),
    confidenceScore: 0.35,
    explanation: t(language, "priceEstimateAiGuidanceExplanation")
  };
}

function parseAiEstimate(text: string, fallback: ReturnType<typeof localGuidanceEstimate>) {
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<typeof fallback>;
    const estimatedPrice = Number(parsed.estimatedPrice);
    const minPrice = Number(parsed.minPrice);
    const maxPrice = Number(parsed.maxPrice);
    const confidence = Number(parsed.confidenceScore);
    return {
      estimatedPrice: Number.isFinite(estimatedPrice) && estimatedPrice > 0 ? roundMoney(estimatedPrice) : fallback.estimatedPrice,
      minPrice: Number.isFinite(minPrice) && minPrice > 0 ? roundMoney(minPrice) : fallback.minPrice,
      maxPrice: Number.isFinite(maxPrice) && maxPrice > 0 ? roundMoney(maxPrice) : fallback.maxPrice,
      confidenceScore: Number.isFinite(confidence) ? Math.min(0.55, Math.max(0.25, confidence)) : fallback.confidenceScore,
      explanation: typeof parsed.explanation === "string" && parsed.explanation.trim() ? parsed.explanation.trim() : fallback.explanation
    };
  } catch {
    return fallback;
  }
}

async function generateAiGuidanceEstimate(input: PriceEstimateInput) {
  const fallback = localGuidanceEstimate(input);
  const ai = getGeminiClient();
  if (!ai) return fallback;
  const language = normalizeLanguage(input.language);

  const prompt = JSON.stringify(
    {
      task: "Estimate a general Egyptian real estate market price range when local database comparables are unavailable. Return only JSON.",
      responseLanguage: language === "ar" ? "Arabic" : "English",
      property: input,
      requiredJson: {
        estimatedPrice: "number in EGP",
        minPrice: "number in EGP",
        maxPrice: "number in EGP",
        confidenceScore: "number from 0.25 to 0.55 because there are no database comparables",
        explanation: "short practical explanation including that this is AI guidance, not verified database valuation"
      },
      rules: [
        "Do not claim access to live listings.",
        "Use the database only if provided; here it is not available.",
        "Be conservative and give a range.",
        "Mention if price may be high, medium, or low for the area/type."
      ]
    },
    null,
    2
  );

  for (const model of getGeminiModelCandidates()) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: "You are a cautious real estate valuation assistant for Egypt. Return only JSON.",
            responseMimeType: "application/json",
            temperature: 0.3
          }
        }),
        getAiTimeoutMs()
      );
      return parseAiEstimate(response.text ?? "", fallback);
    } catch {
      continue;
    }
  }

  return fallback;
}

function buildExplanation(
  input: PriceEstimateInput,
  comparables: ComparableProperty[],
  basedOn: "similar_properties" | "city_type_average",
  avgPricePerSqm: number
) {
  const language = normalizeLanguage(input.language);
  const location = cleanOptionalText(input.area) ?? cleanOptionalText(input.district) ?? input.city;
  const key = basedOn === "similar_properties" ? "priceEstimateExplanationSimilar" : "priceEstimateExplanationCityAverage";
  return t(language, key, {
    count: comparables.length,
    location,
    propertyType: input.propertyType.toLowerCase(),
    city: input.city,
    pricePerSqm: roundMoney(avgPricePerSqm).toLocaleString()
  });
}

async function findComparables(input: PriceEstimateInput) {
  const type = cleanText(input.propertyType).toUpperCase();
  const city = cleanText(input.city);
  const area = cleanOptionalText(input.area);
  const district = cleanOptionalText(input.district);
  const minArea = Math.max(1, input.areaSqm * 0.75);
  const maxArea = input.areaSqm * 1.25;

  const similar = await prisma.property.findMany({
    where: {
      listing: { status: "APPROVED", soldAt: null },
      transaction: "BUY",
      type: type as never,
      city: { equals: city, mode: "insensitive" },
      price: { not: null },
      areaSqm: { gte: minArea, lte: maxArea },
      ...(area || district
        ? {
            OR: [
              ...(area ? [{ area: { equals: area, mode: "insensitive" as const } }] : []),
              ...(district ? [{ district: { equals: district, mode: "insensitive" as const } }] : [])
            ]
          }
        : {}),
      ...(input.bedrooms != null ? { bedrooms: { gte: Math.max(0, input.bedrooms - 1), lte: input.bedrooms + 1 } } : {}),
      ...(input.bathrooms != null ? { bathrooms: { gte: Math.max(0, input.bathrooms - 1), lte: input.bathrooms + 1 } } : {})
    },
    select: {
      id: true,
      price: true,
      pricePerSqm: true,
      areaSqm: true,
      bedrooms: true,
      bathrooms: true,
      furnishing: true,
      paymentType: true,
      completionStatus: true
    },
    take: 100
  });

  if (similar.length >= 3) {
    return { comparables: similar, basedOn: "similar_properties" as const };
  }

  const fallback = await prisma.property.findMany({
    where: {
      listing: { status: "APPROVED", soldAt: null },
      transaction: "BUY",
      type: type as never,
      city: { equals: city, mode: "insensitive" },
      price: { not: null }
    },
    select: {
      id: true,
      price: true,
      pricePerSqm: true,
      areaSqm: true,
      bedrooms: true,
      bathrooms: true,
      furnishing: true,
      paymentType: true,
      completionStatus: true
    },
    take: 200
  });

  return { comparables: fallback, basedOn: "city_type_average" as const };
}

export async function createPriceEstimate(input: PriceEstimateInput): Promise<PriceEstimateResult> {
  const normalized: PriceEstimateInput = {
    ...input,
    language: normalizeLanguage(input.language),
    propertyType: cleanText(input.propertyType).toUpperCase(),
    city: cleanText(input.city),
    area: cleanOptionalText(input.area),
    district: cleanOptionalText(input.district),
    areaSqm: Number(input.areaSqm),
    bedrooms: input.bedrooms == null ? null : Number(input.bedrooms),
    bathrooms: input.bathrooms == null ? null : Number(input.bathrooms),
    furnishing: cleanOptionalText(input.furnishing)?.toUpperCase() ?? null,
    completionStatus: cleanOptionalText(input.completionStatus)?.toUpperCase() ?? null,
    paymentType: cleanOptionalText(input.paymentType)?.toUpperCase() ?? null
  };

  if (!normalized.propertyType || !normalized.city || !Number.isFinite(normalized.areaSqm) || normalized.areaSqm <= 0) {
    return { ok: false, message: t(normalizeLanguage(normalized.language), "priceEstimatorValidationRequired") };
  }

  const { comparables, basedOn } = await findComparables(normalized);
  const usableComparables = comparables.filter((property) => pricePerSqm(property) != null);

  if (usableComparables.length < 2) {
    const aiEstimate = await generateAiGuidanceEstimate(normalized);
    const estimate = await prisma.priceEstimate.create({
      data: {
        userId: normalized.userId ?? null,
        propertyType: normalized.propertyType,
        city: normalized.city,
        area: normalized.area,
        district: normalized.district,
        areaSqm: normalized.areaSqm,
        bedrooms: normalized.bedrooms,
        bathrooms: normalized.bathrooms,
        furnishing: normalized.furnishing,
        completionStatus: normalized.completionStatus,
        paymentType: normalized.paymentType,
        estimatedPrice: aiEstimate.estimatedPrice,
        minPrice: aiEstimate.minPrice,
        maxPrice: aiEstimate.maxPrice,
        confidenceScore: aiEstimate.confidenceScore,
        explanation: aiEstimate.explanation
      }
    });

    await prisma.analyticsEvent
      .create({
        data: {
          userId: normalized.userId ?? null,
          eventType: "PRICE_ESTIMATE",
          metadata: {
            estimateId: estimate.id,
            propertyType: normalized.propertyType,
            city: normalized.city,
            comparableCount: usableComparables.length,
            basedOn: "ai_market_guidance"
          }
        }
      })
      .catch(() => undefined);

    return {
      ok: true,
      estimate: {
        id: estimate.id,
        estimatedPrice: estimate.estimatedPrice,
        minPrice: estimate.minPrice,
        maxPrice: estimate.maxPrice,
        confidenceScore: estimate.confidenceScore,
        explanation: estimate.explanation ?? aiEstimate.explanation,
        comparableCount: usableComparables.length,
        basedOn: "ai_market_guidance",
        createdAt: estimate.createdAt.toISOString()
      }
    };
  }

  const sqmPrices = usableComparables.map((property) => pricePerSqm(property)).filter((value): value is number => value != null);
  const avgPricePerSqm = median(sqmPrices);
  const adjustedMultiplier = optionMultiplier(normalized) + roomAdjustment(normalized, usableComparables);
  const estimatedPrice = roundMoney(avgPricePerSqm * normalized.areaSqm * adjustedMultiplier);
  const confidence = confidenceScore(normalized, usableComparables, basedOn);
  const spread = basedOn === "similar_properties" ? 0.12 : 0.2;
  const explanation = buildExplanation(normalized, usableComparables, basedOn, avgPricePerSqm);

  const estimate = await prisma.priceEstimate.create({
    data: {
      userId: normalized.userId ?? null,
      propertyType: normalized.propertyType,
      city: normalized.city,
      area: normalized.area,
      district: normalized.district,
      areaSqm: normalized.areaSqm,
      bedrooms: normalized.bedrooms,
      bathrooms: normalized.bathrooms,
      furnishing: normalized.furnishing,
      completionStatus: normalized.completionStatus,
      paymentType: normalized.paymentType,
      estimatedPrice,
      minPrice: roundMoney(estimatedPrice * (1 - spread)),
      maxPrice: roundMoney(estimatedPrice * (1 + spread)),
      confidenceScore: confidence,
      explanation
    }
  });

  await prisma.analyticsEvent
    .create({
      data: {
        userId: normalized.userId ?? null,
        eventType: "PRICE_ESTIMATE",
        metadata: {
          estimateId: estimate.id,
          propertyType: normalized.propertyType,
          city: normalized.city,
          area: normalized.area,
          district: normalized.district,
          comparableCount: usableComparables.length,
          basedOn
        }
      }
    })
    .catch(() => undefined);

  return {
    ok: true,
    estimate: {
      id: estimate.id,
      estimatedPrice: estimate.estimatedPrice,
      minPrice: estimate.minPrice,
      maxPrice: estimate.maxPrice,
      confidenceScore: estimate.confidenceScore,
      explanation: estimate.explanation ?? explanation,
      comparableCount: usableComparables.length,
      basedOn,
      createdAt: estimate.createdAt.toISOString()
    }
  };
}

export async function listRecentPriceEstimates(userId: string, take = 5) {
  const estimates = await prisma.priceEstimate.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take
  });

  return estimates.map((estimate) => ({
    id: estimate.id,
    propertyType: estimate.propertyType,
    city: estimate.city,
    area: estimate.area,
    district: estimate.district,
    areaSqm: estimate.areaSqm,
    estimatedPrice: estimate.estimatedPrice,
    minPrice: estimate.minPrice,
    maxPrice: estimate.maxPrice,
    confidenceScore: estimate.confidenceScore,
    explanation: estimate.explanation,
    createdAt: estimate.createdAt.toISOString()
  }));
}

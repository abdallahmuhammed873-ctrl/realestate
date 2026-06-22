import { GoogleGenAI } from "@google/genai";
import { normalizeLanguage, t, type Language } from "../i18n.ts";
import { getAiTimeoutMs, getGeminiApiKey, getGeminiModelCandidates } from "../server/ai-config.ts";
import { prisma } from "../server/prisma.ts";
import { trackAnalyticsEvent } from "./analytics-service.ts";

export type InvestmentPlannerInput = {
  userId?: string | null;
  language?: Language | string | null;
  monthlySalary: number;
  monthlyExpenses?: number | null;
  currentSavings?: number | null;
  propertyType?: string | null;
  city?: string | null;
  area?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  preferredPaymentType?: string | null;
  riskLevel?: string | null;
  notes?: string | null;
};

type PlannerProperty = {
  id: string;
  title: string;
  type: string;
  city: string;
  area: string;
  district: string;
  price: number | null;
  currency: string;
  areaSqm: number;
  bedrooms: number;
  bathrooms: number;
  paymentType: string;
  completionStatus: string;
  furnishing: string;
  installmentDownPayment: number | null;
  installmentMonthly: number | null;
  installmentYears: number | null;
};

type PlannerResponse = {
  summary: string;
  affordabilityLevel: "LOW" | "MEDIUM" | "HIGH";
  recommendedMonthlyBudget: number;
  estimatedAffordablePrice: number;
  plans: Array<{
    title: string;
    years: number;
    downPaymentTarget: number;
    monthlySaving: number;
    expectedMonthlyInstallment: number;
    recommendation: string;
  }>;
  recommendations: string[];
  matchedProperties: Array<PlannerProperty & { reason: string }>;
  aiUsed: boolean;
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

function money(value: number) {
  return Math.max(0, Math.round(value / 1000) * 1000);
}

function optionalText(value?: string | null) {
  const cleaned = String(value ?? "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function cleanNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function affordabilityLevel(monthlySalary: number, estimatedAffordablePrice: number, targetPrice: number | null): "LOW" | "MEDIUM" | "HIGH" {
  if (!targetPrice || targetPrice <= 0) return estimatedAffordablePrice >= monthlySalary * 90 ? "MEDIUM" : "LOW";
  const ratio = estimatedAffordablePrice / targetPrice;
  if (ratio >= 0.85) return "HIGH";
  if (ratio >= 0.55) return "MEDIUM";
  return "LOW";
}

function buildLocalPlans(input: InvestmentPlannerInput, matchedProperties: PlannerProperty[]): PlannerResponse {
  const language = normalizeLanguage(input.language);
  const monthlySalary = Number(input.monthlySalary);
  const monthlyExpenses = cleanNumber(input.monthlyExpenses);
  const currentSavings = cleanNumber(input.currentSavings);
  const disposableIncome = Math.max(0, monthlySalary - monthlyExpenses);
  const recommendedMonthlyBudget = money(Math.min(monthlySalary * 0.35, disposableIncome * 0.55));
  const estimatedAffordablePrice = money(currentSavings + recommendedMonthlyBudget * 12 * 7);
  const targetPrice = matchedProperties[0]?.price ?? null;
  const targetDownPayment = money((targetPrice ?? estimatedAffordablePrice) * 0.2);
  const remainingDownPayment = Math.max(0, targetDownPayment - currentSavings);
  const monthlySaving = Math.max(1000, recommendedMonthlyBudget * 0.75);
  const yearsToDownPayment = Math.max(1, Math.ceil(remainingDownPayment / monthlySaving / 12));
  const level = affordabilityLevel(monthlySalary, estimatedAffordablePrice, targetPrice);

  const plans = [
    {
      title: t(language, "plannerConservativePlan"),
      years: Math.max(2, yearsToDownPayment + 1),
      downPaymentTarget: targetDownPayment,
      monthlySaving: money(monthlySaving * 0.75),
      expectedMonthlyInstallment: money(recommendedMonthlyBudget * 0.65),
      recommendation: t(language, "plannerConservativeRecommendation")
    },
    {
      title: t(language, "plannerBalancedPlan"),
      years: Math.max(1, yearsToDownPayment),
      downPaymentTarget: targetDownPayment,
      monthlySaving: money(monthlySaving),
      expectedMonthlyInstallment: money(recommendedMonthlyBudget),
      recommendation: t(language, "plannerBalancedRecommendation")
    },
    {
      title: t(language, "plannerFastPlan"),
      years: Math.max(1, yearsToDownPayment - 1),
      downPaymentTarget: targetDownPayment,
      monthlySaving: money(monthlySaving * 1.25),
      expectedMonthlyInstallment: money(recommendedMonthlyBudget * 1.15),
      recommendation: t(language, "plannerFastRecommendation")
    }
  ];

  const recommendations = [
    level === "HIGH"
      ? t(language, "plannerHighRecommendation")
      : level === "MEDIUM"
        ? t(language, "plannerMediumRecommendation")
        : t(language, "plannerLowRecommendation"),
    t(language, "plannerPaymentRule"),
    matchedProperties.length > 0
      ? t(language, "plannerMatchedRecommendation")
      : t(language, "plannerNoMatchRecommendation")
  ];

  return {
    summary:
      level === "HIGH"
        ? t(language, "plannerHighSummary")
        : level === "MEDIUM"
          ? t(language, "plannerMediumSummary")
          : t(language, "plannerLowSummary"),
    affordabilityLevel: level,
    recommendedMonthlyBudget,
    estimatedAffordablePrice,
    plans,
    recommendations,
    matchedProperties: matchedProperties.slice(0, 3).map((property) => ({
      ...property,
      reason: t(language, "plannerMatchReason")
    })),
    aiUsed: false
  };
}

function parsePlannerJson(text: string, fallback: PlannerResponse): PlannerResponse {
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<PlannerResponse>;
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
      affordabilityLevel:
        parsed.affordabilityLevel === "LOW" || parsed.affordabilityLevel === "MEDIUM" || parsed.affordabilityLevel === "HIGH"
          ? parsed.affordabilityLevel
          : fallback.affordabilityLevel,
      recommendedMonthlyBudget: Number(parsed.recommendedMonthlyBudget) || fallback.recommendedMonthlyBudget,
      estimatedAffordablePrice: Number(parsed.estimatedAffordablePrice) || fallback.estimatedAffordablePrice,
      plans: Array.isArray(parsed.plans) && parsed.plans.length > 0 ? (parsed.plans.slice(0, 3) as PlannerResponse["plans"]) : fallback.plans,
      recommendations:
        Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
          ? parsed.recommendations.filter((item): item is string => typeof item === "string").slice(0, 6)
          : fallback.recommendations,
      matchedProperties: fallback.matchedProperties,
      aiUsed: true
    };
  } catch {
    return fallback;
  }
}

async function findMatchingProperties(input: InvestmentPlannerInput) {
  const propertyType = optionalText(input.propertyType)?.toUpperCase();
  const city = optionalText(input.city);
  const area = optionalText(input.area);
  const monthlySalary = Number(input.monthlySalary);
  const monthlyExpenses = cleanNumber(input.monthlyExpenses);
  const currentSavings = cleanNumber(input.currentSavings);
  const recommendedMonthlyBudget = Math.min(monthlySalary * 0.35, Math.max(0, monthlySalary - monthlyExpenses) * 0.55);
  const roughMaxPrice = money(currentSavings + recommendedMonthlyBudget * 12 * 9);

  const properties = await prisma.property.findMany({
    where: {
      listing: { status: "APPROVED", soldAt: null },
      transaction: "BUY",
      price: { not: null, lte: roughMaxPrice > 0 ? roughMaxPrice * 1.35 : undefined },
      ...(propertyType ? { type: propertyType as never } : {}),
      ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}),
      ...(area
        ? {
            OR: [
              { area: { equals: area, mode: "insensitive" as const } },
              { district: { equals: area, mode: "insensitive" as const } }
            ]
          }
        : {}),
      ...(input.bedrooms != null ? { bedrooms: { gte: Math.max(0, input.bedrooms - 1), lte: input.bedrooms + 1 } } : {}),
      ...(input.bathrooms != null ? { bathrooms: { gte: Math.max(0, input.bathrooms - 1), lte: input.bathrooms + 1 } } : {}),
      ...(input.preferredPaymentType ? { paymentType: String(input.preferredPaymentType).toUpperCase() as never } : {})
    },
    select: {
      id: true,
      title: true,
      type: true,
      city: true,
      area: true,
      district: true,
      price: true,
      currency: true,
      areaSqm: true,
      bedrooms: true,
      bathrooms: true,
      paymentType: true,
      completionStatus: true,
      furnishing: true,
      installmentDownPayment: true,
      installmentMonthly: true,
      installmentYears: true
    },
    orderBy: [{ price: "asc" }, { createdAt: "desc" }],
    take: 6
  });

  return properties.map((property) => ({
    ...property,
    type: property.type,
    paymentType: property.paymentType,
    completionStatus: property.completionStatus,
    furnishing: property.furnishing
  }));
}

async function generateGeminiPlan(input: InvestmentPlannerInput, fallback: PlannerResponse, matchedProperties: PlannerProperty[]) {
  const ai = getGeminiClient();
  if (!ai) return fallback;
  const language = normalizeLanguage(input.language);

  const prompt = JSON.stringify(
    {
      task: "Create a real estate buying and investment plan for the user. Return only valid JSON.",
      responseLanguage: language === "ar" ? "Arabic" : "English",
      userFinancials: {
        monthlySalary: input.monthlySalary,
        monthlyExpenses: input.monthlyExpenses ?? 0,
        currentSavings: input.currentSavings ?? 0,
        riskLevel: input.riskLevel ?? "MEDIUM"
      },
      desiredFeatures: {
        propertyType: input.propertyType,
        city: input.city,
        area: input.area,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        preferredPaymentType: input.preferredPaymentType,
        notes: input.notes
      },
      platformMatches: matchedProperties,
      localCalculation: fallback,
      rules: [
        "Use platformMatches when they fit the user's features and explain why.",
        "If platformMatches are empty or weak, still provide useful plans using general real estate finance reasoning.",
        "Give 3 plans: conservative, balanced, and fast.",
        "Explain whether the target is high, medium, or low for the user's salary.",
        "Do not claim guaranteed profit or legal/financial certainty.",
        "Keep numbers realistic and in EGP."
      ],
      jsonShape: {
        summary: "string",
        affordabilityLevel: "LOW | MEDIUM | HIGH",
        recommendedMonthlyBudget: "number",
        estimatedAffordablePrice: "number",
        plans: [
          {
            title: "string",
            years: "number",
            downPaymentTarget: "number",
            monthlySaving: "number",
            expectedMonthlyInstallment: "number",
            recommendation: "string"
          }
        ],
        recommendations: ["string"]
      }
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
            systemInstruction:
              "You are a cautious Egyptian real estate investment planner. Return only JSON. Be practical, clear, and avoid promises.",
            responseMimeType: "application/json",
            temperature: 0.35
          }
        }),
        getAiTimeoutMs()
      );
      return parsePlannerJson(response.text ?? "", fallback);
    } catch {
      continue;
    }
  }

  return fallback;
}

export async function createInvestmentPlan(input: InvestmentPlannerInput) {
  if (!Number.isFinite(Number(input.monthlySalary)) || Number(input.monthlySalary) <= 0) {
    return { ok: false as const, message: t(normalizeLanguage(input.language), "investmentPlannerSalaryValidation") };
  }

  const normalized = {
    ...input,
    language: normalizeLanguage(input.language),
    monthlySalary: Number(input.monthlySalary),
    monthlyExpenses: input.monthlyExpenses == null ? 0 : Number(input.monthlyExpenses),
    currentSavings: input.currentSavings == null ? 0 : Number(input.currentSavings),
    propertyType: optionalText(input.propertyType),
    city: optionalText(input.city),
    area: optionalText(input.area),
    preferredPaymentType: optionalText(input.preferredPaymentType),
    riskLevel: optionalText(input.riskLevel) ?? "MEDIUM",
    notes: optionalText(input.notes)
  };

  const matchedProperties = await findMatchingProperties(normalized);
  const fallback = buildLocalPlans(normalized, matchedProperties);
  const plan = await generateGeminiPlan(normalized, fallback, matchedProperties);

  await trackAnalyticsEvent({
    userId: normalized.userId,
    eventType: "PRICE_ESTIMATE",
    metadata: {
      planner: true,
      aiUsed: plan.aiUsed,
      monthlySalary: normalized.monthlySalary,
      propertyType: normalized.propertyType,
      city: normalized.city,
      affordabilityLevel: plan.affordabilityLevel,
      matchedPropertyCount: matchedProperties.length
    }
  });

  return { ok: true as const, plan };
}

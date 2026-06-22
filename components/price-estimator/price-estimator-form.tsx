"use client";

import { FormEvent, PointerEvent, useState } from "react";
import { LoginRequiredModal } from "@/components/auth/login-required-modal";
import { useLanguage } from "@/components/layout/language-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  translateCompletionStatus,
  translateFurnishing,
  translateLocation,
  translatePaymentType,
  translatePropertyType,
  type Language
} from "@/lib/i18n";
import type { CompletionStatus, Furnishing, PaymentType, PropertyType } from "@/lib/types";
import { cn, formatPrice as formatCurrency } from "@/lib/utils";

type RecentEstimate = {
  id: string;
  propertyType: string;
  city: string;
  area: string | null;
  district: string | null;
  areaSqm: number;
  estimatedPrice: number;
  minPrice: number;
  maxPrice: number;
  confidenceScore: number;
  createdAt: string;
};

type EstimateResult = {
  id: string;
  estimatedPrice: number;
  minPrice: number;
  maxPrice: number;
  confidenceScore: number;
  explanation: string;
  comparableCount: number;
  basedOn: "similar_properties" | "city_type_average" | "ai_market_guidance";
};

type EstimateDetails = {
  propertyType: PropertyType;
  city: string;
  area?: string | null;
  district?: string | null;
};

type InvestmentPlan = {
  summary: string;
  affordabilityLevel: "LOW" | "MEDIUM" | "HIGH";
  recommendedMonthlyBudget: number;
  estimatedAffordablePrice: number;
  aiUsed: boolean;
  plans: Array<{
    title: string;
    years: number;
    downPaymentTarget: number;
    monthlySaving: number;
    expectedMonthlyInstallment: number;
    recommendation: string;
  }>;
  recommendations: string[];
  matchedProperties: Array<{
    id: string;
    title: string;
    city: string;
    area: string;
    district: string;
    price: number | null;
    currency: string;
    bedrooms: number;
    bathrooms: number;
    areaSqm: number;
    paymentType: string;
    reason: string;
  }>;
};

const propertyTypes: PropertyType[] = ["APARTMENT", "VILLA", "DUPLEX", "PENTHOUSE", "CHALET", "LAND", "COMMERCIAL"];
const furnishingOptions: Furnishing[] = ["FULLY", "SEMI", "UNFURNISHED"];
const completionOptions: CompletionStatus[] = ["READY", "OFF_PLAN"];
const paymentOptions: PaymentType[] = ["CASH", "INSTALLMENTS"];

function formatPrice(value: number, language: Language) {
  return formatCurrency(value, "EGP", language);
}

function formatPercent(value: number, language: Language) {
  return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
    style: "percent",
    maximumFractionDigits: 0
  }).format(value);
}

function toPropertyType(value: FormDataEntryValue | null): PropertyType {
  return propertyTypes.includes(String(value) as PropertyType) ? (String(value) as PropertyType) : "APARTMENT";
}

function resultHeading(basedOn: EstimateResult["basedOn"], t: ReturnType<typeof useLanguage>["t"]) {
  if (basedOn === "similar_properties") return t("basedOnSimilarProperties");
  if (basedOn === "city_type_average") return t("basedOnCityAverage");
  return t("basedOnAiGuidance");
}

function localizedEstimateExplanation(
  result: EstimateResult,
  details: EstimateDetails | null,
  language: Language,
  t: ReturnType<typeof useLanguage>["t"]
) {
  if (result.basedOn === "ai_market_guidance") return t("priceEstimateAiGuidanceExplanation");
  const location = details?.area ?? details?.district ?? details?.city ?? "";
  if (result.basedOn === "similar_properties") {
    return t("priceEstimateExplanationSimilar", {
      count: result.comparableCount,
      location: translateLocation(location, language)
    });
  }
  return t("priceEstimateExplanationCityAverage", {
    count: result.comparableCount,
    propertyType: details ? translatePropertyType(details.propertyType, language) : "",
    city: translateLocation(details?.city ?? "", language)
  });
}

function affordabilityLabel(value: InvestmentPlan["affordabilityLevel"], t: ReturnType<typeof useLanguage>["t"]) {
  if (value === "HIGH") return t("affordabilityHigh");
  if (value === "MEDIUM") return t("affordabilityMedium");
  return t("affordabilityLow");
}

function planSummary(value: InvestmentPlan["affordabilityLevel"], t: ReturnType<typeof useLanguage>["t"]) {
  if (value === "HIGH") return t("plannerHighSummary");
  if (value === "MEDIUM") return t("plannerMediumSummary");
  return t("plannerLowSummary");
}

function localizedRecommendations(value: InvestmentPlan["affordabilityLevel"], hasMatches: boolean, t: ReturnType<typeof useLanguage>["t"]) {
  return [
    value === "HIGH" ? t("plannerHighRecommendation") : value === "MEDIUM" ? t("plannerMediumRecommendation") : t("plannerLowRecommendation"),
    t("plannerPaymentRule"),
    hasMatches ? t("plannerMatchedRecommendation") : t("plannerNoMatchRecommendation")
  ];
}

function localizedPlanTitle(index: number, fallback: string, t: ReturnType<typeof useLanguage>["t"]) {
  if (index === 0) return t("plannerConservativePlan");
  if (index === 1) return t("plannerBalancedPlan");
  if (index === 2) return t("plannerFastPlan");
  return fallback;
}

function localizedPlanRecommendation(index: number, fallback: string, t: ReturnType<typeof useLanguage>["t"]) {
  if (index === 0) return t("plannerConservativeRecommendation");
  if (index === 1) return t("plannerBalancedRecommendation");
  if (index === 2) return t("plannerFastRecommendation");
  return fallback;
}

function isLockedControlTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("input, select, textarea, button"));
}

export function PriceEstimatorForm({
  recentEstimates,
  isAuthenticated
}: {
  recentEstimates: RecentEstimate[];
  isAuthenticated: boolean;
}) {
  const { language, direction, t } = useLanguage();
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [estimateDetails, setEstimateDetails] = useState<EstimateDetails | null>(null);
  const [plan, setPlan] = useState<InvestmentPlan | null>(null);
  const [error, setError] = useState("");
  const [plannerError, setPlannerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);

  function openLoginRequired() {
    setShowLoginRequired(true);
  }

  function interceptLockedInteraction(event: PointerEvent<HTMLFormElement>) {
    if (isAuthenticated || !isLockedControlTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    openLoginRequired();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated) {
      setShowLoginRequired(true);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const details = {
      propertyType: toPropertyType(formData.get("propertyType")),
      city: String(formData.get("city") ?? ""),
      area: formData.get("area") ? String(formData.get("area")) : null,
      district: formData.get("district") ? String(formData.get("district")) : null
    };
    setEstimateDetails(details);

    try {
      const response = await fetch("/api/price-estimator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, language })
      });
      const body = await response.json();
      if (response.status === 401) {
        setShowLoginRequired(true);
        return;
      }
      if (!response.ok || !body.ok) {
        setError(String(body.message ?? t("priceEstimatorValidationRequired")));
        return;
      }
      setResult(body.estimate);
    } catch {
      setError(t("priceEstimatorGenericError"));
    } finally {
      setLoading(false);
    }
  }

  async function onPlannerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated) {
      setShowLoginRequired(true);
      return;
    }

    setPlannerLoading(true);
    setPlannerError("");
    setPlan(null);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/investment-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, language })
      });
      const body = await response.json();
      if (response.status === 401) {
        setShowLoginRequired(true);
        return;
      }
      if (!response.ok || !body.ok) {
        setPlannerError(String(body.message ?? t("investmentPlannerSalaryValidation")));
        return;
      }
      setPlan(body.plan);
    } catch {
      setPlannerError(t("plannerGenericError"));
    } finally {
      setPlannerLoading(false);
    }
  }

  return (
    <div dir={direction} className={cn("space-y-5", direction === "rtl" ? "text-right" : "text-left")}>
      <div className="grid gap-4 lg:grid-cols-[1.4fr,0.8fr]">
        <Card>
          <form
            onSubmit={onSubmit}
            onPointerDownCapture={interceptLockedInteraction}
            className={cn("space-y-4", !isAuthenticated && "opacity-75")}
          >
            <fieldset aria-disabled={!isAuthenticated} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium">
                  {t("propertyType")}
                  <Select name="propertyType" required defaultValue="APARTMENT">
                    {propertyTypes.map((type) => (
                      <option key={type} value={type}>
                        {translatePropertyType(type, language)}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  {t("city")}
                  <Input name="city" required placeholder={t("placeholderNewCairo")} />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  {t("area")}
                  <Input name="area" placeholder={t("placeholderFifthSettlement")} />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  {t("district")}
                  <Input name="district" placeholder={t("placeholderNorthInvestors")} />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  {t("areaSqm")}
                  <Input name="areaSqm" required type="number" min="1" step="1" placeholder={t("placeholderAreaSqm")} />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  {t("bedrooms")}
                  <Input name="bedrooms" type="number" min="0" step="1" placeholder={t("placeholderBedrooms")} />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  {t("bathrooms")}
                  <Input name="bathrooms" type="number" min="0" step="1" placeholder={t("placeholderBathrooms")} />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  {t("furnishingStatus")}
                  <Select name="furnishing" defaultValue="">
                    <option value="">{t("notSpecified")}</option>
                    {furnishingOptions.map((option) => (
                      <option key={option} value={option}>
                        {translateFurnishing(option, language)}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  {t("completionStatusLabel")}
                  <Select name="completionStatus" defaultValue="">
                    <option value="">{t("notSpecified")}</option>
                    {completionOptions.map((option) => (
                      <option key={option} value={option}>
                        {translateCompletionStatus(option, language)}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  {t("paymentTypeLabel")}
                  <Select name="paymentType" defaultValue="">
                    <option value="">{t("notSpecified")}</option>
                    {paymentOptions.map((option) => (
                      <option key={option} value={option}>
                        {translatePaymentType(option, language)}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>

              {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

              <Button type="submit" disabled={loading} className="cursor-pointer">
                {loading ? t("estimating") : t("estimatePrice")}
              </Button>
            </fieldset>
          </form>
        </Card>

        <div className="space-y-4">
          {result ? (
            <Card className="space-y-3">
              <p className="text-soft text-sm font-semibold uppercase tracking-wide">{resultHeading(result.basedOn, t)}</p>
              <div>
                <p className="text-sm text-[var(--muted)]">{t("estimatedPrice")}</p>
                <p className="text-3xl font-bold">{formatPrice(result.estimatedPrice, language)}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[var(--surface-soft)] p-3">
                  <p className="text-xs text-[var(--muted)]">{t("expectedRange")}</p>
                  <p className="font-semibold">
                    {formatPrice(result.minPrice, language)} - {formatPrice(result.maxPrice, language)}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--surface-soft)] p-3">
                  <p className="text-xs text-[var(--muted)]">{t("confidenceScore")}</p>
                  <p className="font-semibold">{formatPercent(result.confidenceScore, language)}</p>
                </div>
              </div>
              <p className="text-sm text-[var(--muted)]">{localizedEstimateExplanation(result, estimateDetails, language, t)}</p>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-[var(--muted)]">{t("priceEstimatorEmptyHint")}</p>
            </Card>
          )}

          {recentEstimates.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-lg font-bold">{t("recentEstimates")}</h2>
              <div className="space-y-3">
                {recentEstimates.map((estimate) => {
                  const type = propertyTypes.includes(estimate.propertyType as PropertyType)
                    ? translatePropertyType(estimate.propertyType as PropertyType, language)
                    : estimate.propertyType;
                  const location = translateLocation(estimate.area ?? estimate.district ?? estimate.city, language);
                  return (
                    <div key={estimate.id} className="rounded-xl border theme-divider p-3">
                      <p className="font-semibold">{formatPrice(estimate.estimatedPrice, language)}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {t("recentEstimateSummary", { type, location, areaSqm: estimate.areaSqm })}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {t("confidenceValue", { value: formatPercent(estimate.confidenceScore, language) })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <Card>
        <div className="mb-4">
          <p className="text-soft text-sm font-semibold uppercase tracking-wide">{t("investmentPlannerEyebrow")}</p>
          <h2 className="text-xl font-bold">{t("investmentPlannerTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("investmentPlannerDescription")}</p>
        </div>

        <form
          onSubmit={onPlannerSubmit}
          onPointerDownCapture={interceptLockedInteraction}
          className={cn("space-y-4", !isAuthenticated && "opacity-75")}
        >
          <fieldset aria-disabled={!isAuthenticated} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-sm font-medium">
                {t("monthlySalary")}
                <Input name="monthlySalary" required type="number" min="1" step="1000" placeholder={t("placeholderSalary")} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                {t("monthlyExpenses")}
                <Input name="monthlyExpenses" type="number" min="0" step="1000" placeholder={t("placeholderExpenses")} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                {t("currentSavings")}
                <Input name="currentSavings" type="number" min="0" step="1000" placeholder={t("placeholderSavings")} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                {t("propertyType")}
                <Select name="propertyType" defaultValue="">
                  <option value="">{t("anyType")}</option>
                  {propertyTypes.map((type) => (
                    <option key={type} value={type}>
                      {translatePropertyType(type, language)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-1 text-sm font-medium">
                {t("city")}
                <Input name="city" placeholder={t("placeholderNewCairo")} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                {t("areaOrDistrict")}
                <Input name="area" placeholder={t("placeholderFifthSettlement")} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                {t("bedrooms")}
                <Input name="bedrooms" type="number" min="0" step="1" placeholder={t("placeholderBedrooms")} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                {t("bathrooms")}
                <Input name="bathrooms" type="number" min="0" step="1" placeholder={t("placeholderBathrooms")} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                {t("preferredPayment")}
                <Select name="preferredPaymentType" defaultValue="">
                  <option value="">{t("anyPayment")}</option>
                  {paymentOptions.map((option) => (
                    <option key={option} value={option}>
                      {translatePaymentType(option, language)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-1 text-sm font-medium">
                {t("riskLevel")}
                <Select name="riskLevel" defaultValue="MEDIUM">
                  <option value="LOW">{t("lowRisk")}</option>
                  <option value="MEDIUM">{t("mediumRisk")}</option>
                  <option value="HIGH">{t("highRisk")}</option>
                </Select>
              </label>
              <label className="space-y-1 text-sm font-medium md:col-span-2">
                {t("desiredFeatures")}
                <Input name="notes" placeholder={t("placeholderNotes")} />
              </label>
            </div>

            {plannerError ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{plannerError}</p> : null}

            <Button type="submit" disabled={plannerLoading} className="cursor-pointer">
              {plannerLoading ? t("creatingPlan") : t("createInvestmentPlan")}
            </Button>
          </fieldset>
        </form>
      </Card>

      {plan ? (
        <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{t("yourBuyingPlan")}</h2>
              <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold">
                {plan.aiUsed ? t("geminiAiPlan") : t("localFallbackPlan")}
              </span>
            </div>
            <p className="text-sm text-[var(--muted)]">{planSummary(plan.affordabilityLevel, t)}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[var(--surface-soft)] p-3">
                <p className="text-xs text-[var(--muted)]">{t("affordability")}</p>
                <p className="font-bold">{affordabilityLabel(plan.affordabilityLevel, t)}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-soft)] p-3">
                <p className="text-xs text-[var(--muted)]">{t("monthlyBudget")}</p>
                <p className="font-bold">{formatPrice(plan.recommendedMonthlyBudget, language)}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-soft)] p-3">
                <p className="text-xs text-[var(--muted)]">{t("affordablePrice")}</p>
                <p className="font-bold">{formatPrice(plan.estimatedAffordablePrice, language)}</p>
              </div>
            </div>
            <div className="space-y-3">
              {plan.plans.map((item, index) => {
                const title = localizedPlanTitle(index, item.title, t);
                return (
                  <div key={`${item.title}-${index}`} className="rounded-xl border theme-divider p-3">
                    <p className="font-semibold">{t("planYearsLabel", { title, years: item.years })}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {t("planPaymentLine", {
                        monthlySaving: formatPrice(item.monthlySaving, language),
                        downPaymentTarget: formatPrice(item.downPaymentTarget, language),
                        installment: formatPrice(item.expectedMonthlyInstallment, language)
                      })}
                    </p>
                    <p className="mt-1 text-sm">{localizedPlanRecommendation(index, item.recommendation, t)}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <h2 className="mb-3 text-lg font-bold">{t("recommendations")}</h2>
              <div className="space-y-2">
                {localizedRecommendations(plan.affordabilityLevel, plan.matchedProperties.length > 0, t).map((item) => (
                  <p key={item} className="rounded-xl bg-[var(--surface-soft)] p-3 text-sm">
                    {item}
                  </p>
                ))}
              </div>
            </Card>
            {plan.matchedProperties.length > 0 ? (
              <Card>
                <h2 className="mb-3 text-lg font-bold">{t("suitableDatabaseMatches")}</h2>
                <div className="space-y-3">
                  {plan.matchedProperties.map((property) => (
                    <a key={property.id} href={`/p/${property.id}`} className="block rounded-xl border theme-divider p-3 hover:bg-[var(--surface-soft)]">
                      <p className="font-semibold">{property.title}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {t("matchedPropertyLine", {
                          price: formatPrice(property.price ?? 0, language),
                          city: translateLocation(property.city, language),
                          area: translateLocation(property.area, language),
                          bedrooms: property.bedrooms,
                          areaSqm: property.areaSqm
                        })}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{t("plannerMatchReason")}</p>
                    </a>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      <LoginRequiredModal open={showLoginRequired} onClose={() => setShowLoginRequired(false)} />
    </div>
  );
}

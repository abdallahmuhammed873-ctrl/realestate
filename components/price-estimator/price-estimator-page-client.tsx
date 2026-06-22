"use client";

import { useLanguage } from "@/components/layout/language-provider";
import { PriceEstimatorForm } from "@/components/price-estimator/price-estimator-form";
import { cn } from "@/lib/utils";

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

export function PriceEstimatorPageClient({
  recentEstimates,
  isAuthenticated
}: {
  recentEstimates: RecentEstimate[];
  isAuthenticated: boolean;
}) {
  const { direction, t } = useLanguage();

  return (
    <div dir={direction} className={cn("space-y-5", direction === "rtl" ? "text-right" : "text-left")}>
      <div>
        <p className="text-soft text-sm font-semibold uppercase tracking-wide">{t("priceEstimatorEyebrow")}</p>
        <h1 className="text-2xl font-bold">{t("priceEstimatorTitle")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">{t("priceEstimatorDescription")}</p>
      </div>
      <PriceEstimatorForm recentEstimates={recentEstimates} isAuthenticated={isAuthenticated} />
    </div>
  );
}

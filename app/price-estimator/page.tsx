import { PriceEstimatorPageClient } from "@/components/price-estimator/price-estimator-page-client";
import { getCurrentUserId } from "@/lib/auth";
import { listRecentPriceEstimates } from "@/lib/repository";

export default async function PriceEstimatorPage() {
  const userId = await getCurrentUserId();
  const recentEstimates = userId ? await listRecentPriceEstimates(userId) : [];

  return <PriceEstimatorPageClient recentEstimates={recentEstimates} isAuthenticated={Boolean(userId)} />;
}

import { redirect } from "next/navigation";
import { AdminAnalyticsClient } from "@/components/admin/admin-analytics-client";
import { requireRole } from "@/lib/auth";
import { getAdminAnalyticsDashboard, normalizeAnalyticsFilters } from "@/lib/repository";

export default async function AdminAnalyticsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/auth");

  const filters = normalizeAnalyticsFilters(await searchParams);
  const analytics = await getAdminAnalyticsDashboard(filters);

  return <AdminAnalyticsClient analytics={analytics} filters={filters} />;
}

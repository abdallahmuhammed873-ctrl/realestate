import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminAnalyticsDashboard, normalizeAnalyticsFilters } from "@/lib/repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function queryToInput(params: URLSearchParams) {
  const input: Record<string, string[]> = {};
  for (const [key, value] of params.entries()) {
    input[key] = [...(input[key] ?? []), value];
  }
  return input;
}

export async function GET(req: NextRequest) {
  const user = await requireRole(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const filters = normalizeAnalyticsFilters(queryToInput(req.nextUrl.searchParams));
  const analytics = await getAdminAnalyticsDashboard(filters);
  return NextResponse.json(analytics, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Expires: "0",
      Pragma: "no-cache"
    }
  });
}

import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedInternalAiRequest, safeParseInternalAiSearchFilters } from "@/lib/ai-contract";
import { searchAiReadableProperties } from "@/lib/repository";

export async function POST(req: NextRequest) {
  const traceId = req.headers.get("x-chat-trace-id")?.trim() || `internal-ai-search-${Date.now()}`;
  if (!isAuthorizedInternalAiRequest(req)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[AI Search][${traceId}] unauthorized request`);
    }
    return NextResponse.json({ error: "Unauthorized internal AI request." }, { status: 401 });
  }

  const rawBody = await req.json().catch(() => null);
  if (process.env.NODE_ENV !== "production") {
    console.info(`[AI Search][${traceId}] incoming filters`, rawBody);
  }

  const parsed = safeParseInternalAiSearchFilters(rawBody);
  if (!parsed.success) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[AI Search][${traceId}] invalid filters`, parsed.error.flatten());
    }
    return NextResponse.json(
      {
        error: "Invalid AI property search payload.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const startedAt = Date.now();
  const result = await searchAiReadableProperties(parsed.data);
  if (process.env.NODE_ENV !== "production") {
    console.info(`[AI Search][${traceId}] result in ${Date.now() - startedAt}ms`, {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      itemIds: result.items.map((item) => item.id),
      itemTitles: result.items.map((item) => item.title)
    });
  }

  return NextResponse.json(result);
}

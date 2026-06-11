import { NextRequest, NextResponse } from "next/server";
import { searchProperties } from "@/lib/repository";
import { safeParsePublicSearchFilters } from "@/lib/search-contract";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  const rawFilters = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = safeParsePublicSearchFilters(rawFilters);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid search query parameters.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  return NextResponse.json(await searchProperties(parsed.data), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Expires: "0",
      Pragma: "no-cache"
    }
  });
}

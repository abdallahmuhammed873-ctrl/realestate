import { NextRequest, NextResponse } from "next/server";
import { getRequestOrigin, toMobilePropertySearchResponse } from "@/lib/mobile-api";
import { searchProperties } from "@/lib/repository";
import { safeParsePublicSearchFilters } from "@/lib/search-contract";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const result = await searchProperties(parsed.data);
  return NextResponse.json(toMobilePropertySearchResponse(result, getRequestOrigin(req)), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

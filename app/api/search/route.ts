import { NextRequest, NextResponse } from "next/server";
import { searchProperties } from "@/lib/repository";
import { safeParsePublicSearchFilters } from "@/lib/search-contract";

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

  return NextResponse.json(await searchProperties(parsed.data));
}

import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedInternalAiRequest, safeParseInternalAiSearchFilters } from "@/lib/ai-contract";
import { searchAiReadableProperties } from "@/lib/repository";

export async function POST(req: NextRequest) {
  if (!isAuthorizedInternalAiRequest(req)) {
    return NextResponse.json({ error: "Unauthorized internal AI request." }, { status: 401 });
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = safeParseInternalAiSearchFilters(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid AI property search payload.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  return NextResponse.json(await searchAiReadableProperties(parsed.data));
}

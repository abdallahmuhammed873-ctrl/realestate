import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { aiLanguageSchema } from "@/lib/ai-contract";
import {
  LIVE_EXTERNAL_MARKET_TOOL_NAME,
  LIVE_PLATFORM_SEARCH_TOOL_NAME,
  searchLiveExternalMarket,
  searchLivePlatformProperties
} from "@/lib/server/ai-live-service";

const liveToolRequestSchema = z
  .object({
    name: z.enum([LIVE_PLATFORM_SEARCH_TOOL_NAME, LIVE_EXTERNAL_MARKET_TOOL_NAME]),
    args: z.record(z.unknown()).optional(),
    fallbackQuery: z.string().optional(),
    language: aiLanguageSchema.optional()
  })
  .strict();

function getToolQuery(args: Record<string, unknown> | undefined, fallbackQuery: string | undefined) {
  const query = typeof args?.query === "string" ? args.query.trim() : "";
  const fallback = typeof fallbackQuery === "string" ? fallbackQuery.trim() : "";
  if (!query && !fallback) throw new Error("The live assistant tool call did not include a query.");
  return query || fallback;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.json().catch(() => null);
  const parsed = liveToolRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid live assistant tool payload.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  try {
    const query = getToolQuery(parsed.data.args, parsed.data.fallbackQuery);
    const language = parsed.data.language ?? "EN";
    const output =
      parsed.data.name === LIVE_PLATFORM_SEARCH_TOOL_NAME
        ? await searchLivePlatformProperties(query)
        : await searchLiveExternalMarket(query, language);

    return NextResponse.json({
      ok: true,
      name: parsed.data.name,
      output
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown live assistant tool error.";
    if (process.env.NODE_ENV !== "production") {
      console.error("[AI Live] tool execution failed", parsed.data.name, details);
    }
    return NextResponse.json(
      {
        error: "Live assistant tool execution failed.",
        details
      },
      { status: 500 }
    );
  }
}

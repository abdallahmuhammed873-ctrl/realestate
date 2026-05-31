import { NextResponse } from "next/server";
import { getDatabaseHealthCheck } from "@/lib/server/health.ts";
import { getGeminiStatus } from "@/lib/server/ai-config";

export async function GET() {
  const database = await getDatabaseHealthCheck();
  const gemini = getGeminiStatus();
  const status = database.status === "ok" && gemini.configured ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      database,
      aiService: {
        status: gemini.configured ? "ok" : "error",
        provider: gemini.provider,
        model: gemini.model,
        details: gemini.configured ? undefined : "GEMINI_API_KEY is not configured."
      }
    },
    { status: status === "ok" ? 200 : 503 }
  );
}

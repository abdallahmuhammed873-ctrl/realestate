import { NextRequest, NextResponse } from "next/server";
import { aiChatRequestSchema } from "@/lib/ai-contract";

function getAiServiceUrl() {
  return process.env.PYTHON_AI_SERVICE_URL?.trim() || "http://127.0.0.1:8001";
}

export async function POST(req: NextRequest) {
  const rawBody = await req.json().catch(() => null);
  const parsed = aiChatRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid chat payload.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${getAiServiceUrl()}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      signal: controller.signal
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.error || "AI service request failed.",
          details: data
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown AI service error.";
    return NextResponse.json(
      {
        error: "Python AI service is unavailable.",
        details
      },
      { status: 503 }
    );
  } finally {
    clearTimeout(timeout);
  }
}

import { NextResponse } from "next/server";
import { aiChatRequestSchema } from "../ai-contract.ts";

function getAiServiceUrl() {
  return process.env.PYTHON_AI_SERVICE_URL?.trim() || "http://127.0.0.1:8001";
}

export async function proxyAiChatRequest(rawBody: unknown) {
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
    async function postChat(payload: unknown) {
      const response = await fetch(`${getAiServiceUrl()}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: controller.signal
      });
      const data = await response.json().catch(() => null);
      return { response, data };
    }

    let { response, data } = await postChat(parsed.data);

    // Backward compatibility: if an older Python AI service rejects the new
    // `history` field with 422, retry once with the legacy payload shape.
    if (response.status === 422 && parsed.data.history && parsed.data.history.length > 0) {
      ({ response, data } = await postChat({
        message: parsed.data.message,
        language: parsed.data.language
      }));
    }

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

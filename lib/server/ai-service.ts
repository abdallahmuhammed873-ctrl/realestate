import { NextResponse } from "next/server";
import { aiChatRequestSchema } from "../ai-contract.ts";

function getAiServiceUrl() {
  return process.env.PYTHON_AI_SERVICE_URL?.trim() || "http://127.0.0.1:8001";
}

function getAiServiceTimeoutMs() {
  const configured = Number(process.env.AI_SERVICE_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : 60_000;
}

export async function proxyAiChatRequest(rawBody: unknown, traceId?: string) {
  const parsed = aiChatRequestSchema.safeParse(rawBody);
  const requestTraceId = traceId?.trim() || `chat-${Date.now()}`;

  if (process.env.NODE_ENV !== "production") {
    console.info(`[AI Chat][${requestTraceId}] validating payload`, rawBody);
  }

  if (!parsed.success) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[AI Chat][${requestTraceId}] invalid payload`, parsed.error.flatten());
    }
    return NextResponse.json(
      {
        error: "Invalid chat payload.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getAiServiceTimeoutMs());

  try {
    async function postChat(payload: unknown) {
      const startedAt = Date.now();
      if (process.env.NODE_ENV !== "production") {
        console.info(`[AI Chat][${requestTraceId}] proxy -> python`, payload);
      }
      const response = await fetch(`${getAiServiceUrl()}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-chat-trace-id": requestTraceId
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: controller.signal
      });
      const data = await response.json().catch(() => null);
      if (process.env.NODE_ENV !== "production") {
        console.info(`[AI Chat][${requestTraceId}] python -> proxy ${response.status} in ${Date.now() - startedAt}ms`, data);
      }
      return { response, data };
    }

    let { response, data } = await postChat(parsed.data);

    // Backward compatibility: if an older Python AI service rejects the new
    // `history` field with 422, retry once with the legacy payload shape.
    if (response.status === 422 && parsed.data.history && parsed.data.history.length > 0) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[AI Chat][${requestTraceId}] retrying with legacy payload after 422`);
      }
      ({ response, data } = await postChat({
        message: parsed.data.message,
        language: parsed.data.language
      }));
    }

    if (!response.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[AI Chat][${requestTraceId}] returning error ${response.status}`, data);
      }
      return NextResponse.json(
        {
          error: data?.error || "AI service request failed.",
          details: data
        },
        { status: response.status }
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.info(`[AI Chat][${requestTraceId}] success`, {
        intent: data?.intent,
        total: data?.total,
        suggestions: Array.isArray(data?.suggestions) ? data.suggestions.length : 0,
      });
    }
    return NextResponse.json(data);
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown AI service error.";
    if (process.env.NODE_ENV !== "production") {
      console.error(`[AI Chat][${requestTraceId}] proxy failure`, details);
    }
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

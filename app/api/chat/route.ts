import { NextRequest } from "next/server";
import { proxyAiChatRequest } from "@/lib/server/ai-service";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const traceId = req.headers.get("x-chat-trace-id")?.trim() || `chat-${Date.now()}`;

  if (process.env.NODE_ENV !== "production") {
    console.info(`[AI Chat][${traceId}] incoming /api/chat`, body);
  }

  return proxyAiChatRequest(body, traceId);
}

import { NextRequest } from "next/server";
import { handleAiChatRequest } from "@/lib/server/ai-service";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const traceId = req.headers.get("x-chat-trace-id")?.trim() || `ai-chat-${Date.now()}`;
  return handleAiChatRequest(body, traceId);
}

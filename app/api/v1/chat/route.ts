import { NextRequest } from "next/server";
import { proxyAiChatRequest } from "@/lib/server/ai-service";

export async function POST(req: NextRequest) {
  return proxyAiChatRequest(await req.json().catch(() => null));
}

import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedInternalAiRequest } from "@/lib/ai-contract";
import { getDatabaseHealthCheck } from "@/lib/server/health.ts";

export async function GET(req: NextRequest) {
  if (!isAuthorizedInternalAiRequest(req)) {
    return NextResponse.json({ error: "Unauthorized internal AI request." }, { status: 401 });
  }

  const database = await getDatabaseHealthCheck();
  const status = database.status === "ok" ? "ok" : "degraded";
  const statusCode = database.status === "ok" ? 200 : 503;

  return NextResponse.json(
    {
      status,
      database
    },
    { status: statusCode }
  );
}

import { NextResponse } from "next/server";
import { getBackendHealthSnapshot } from "@/lib/server/health.ts";

export async function GET() {
  const snapshot = await getBackendHealthSnapshot();
  const statusCode = snapshot.status === "ok" ? 200 : 503;
  return NextResponse.json(snapshot, { status: statusCode });
}

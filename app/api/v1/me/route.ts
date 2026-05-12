import { NextRequest, NextResponse } from "next/server";
import { getMobileAuthenticatedUser, unauthorizedMobileResponse } from "@/lib/mobile-auth";
import { getRequestOrigin, toMobileUser } from "@/lib/mobile-api";

export async function GET(req: NextRequest) {
  const user = await getMobileAuthenticatedUser(req);
  if (!user) return unauthorizedMobileResponse();

  return NextResponse.json({
    user: toMobileUser(user, { origin: getRequestOrigin(req) })
  });
}

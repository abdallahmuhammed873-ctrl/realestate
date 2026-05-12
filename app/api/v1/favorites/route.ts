import { NextRequest, NextResponse } from "next/server";
import { getMobileAuthenticatedUser, unauthorizedMobileResponse } from "@/lib/mobile-auth";
import { getRequestOrigin, toMobilePublicProperty } from "@/lib/mobile-api";
import { listFavorites } from "@/lib/repository";

export async function GET(req: NextRequest) {
  const user = await getMobileAuthenticatedUser(req);
  if (!user) return unauthorizedMobileResponse();

  const items = await listFavorites(user.id);
  const origin = getRequestOrigin(req);
  return NextResponse.json({
    items: items.map((item) => toMobilePublicProperty(item, { origin }))
  });
}

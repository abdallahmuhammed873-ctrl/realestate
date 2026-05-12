import { NextRequest, NextResponse } from "next/server";
import { getMobileAuthenticatedUser, unauthorizedMobileResponse } from "@/lib/mobile-auth";
import { toggleFavorite } from "@/lib/repository";

export async function POST(req: NextRequest) {
  const user = await getMobileAuthenticatedUser(req);
  if (!user) return unauthorizedMobileResponse();

  const body = await req.json().catch(() => ({}));
  const propertyId = String(body.propertyId ?? "");
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId required" }, { status: 400 });
  }

  return NextResponse.json(await toggleFavorite(user.id, propertyId));
}

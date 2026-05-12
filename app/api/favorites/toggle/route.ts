import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { toggleFavorite } from "@/lib/repository";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const propertyId = String(body.propertyId ?? "");
  if (!propertyId) return NextResponse.json({ error: "propertyId required" }, { status: 400 });
  return NextResponse.json(await toggleFavorite(userId, propertyId));
}

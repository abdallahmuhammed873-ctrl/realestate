import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { toggleFavorite } from "@/lib/repository";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const propertyId = String(body.propertyId ?? "");
  if (!propertyId) return NextResponse.json({ error: "propertyId required" }, { status: 400 });
  return NextResponse.json(toggleFavorite(userId, propertyId));
}

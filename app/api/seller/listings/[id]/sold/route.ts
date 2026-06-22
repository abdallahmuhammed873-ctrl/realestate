import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getUserById, markSellerListingSold } from "@/lib/repository";

type Context = { params: Promise<{ id: string }> };

export async function POST(_: Request, ctx: Context) {
  const userId = await getCurrentUserId();
  const user = await getUserById(userId);
  if (!user || user.role !== "SELLER") return NextResponse.json({ error: "Seller access required" }, { status: 403 });

  const { id } = await ctx.params;
  const result = await markSellerListingSold(id, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, listingId: result.listingId, propertyId: result.propertyId });
}

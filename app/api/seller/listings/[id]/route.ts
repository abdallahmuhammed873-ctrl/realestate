import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSellerListing, getUserById } from "@/lib/repository";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, ctx: Context) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  const user = getUserById(userId);
  if (!user || user.role !== "SELLER") return NextResponse.json({ error: "Seller access required" }, { status: 403 });

  const { id } = await ctx.params;
  const result = deleteSellerListing(id, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}


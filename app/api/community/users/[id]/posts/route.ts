import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getUserById, listSellerCommunityListings, listSellerCommunityPosts } from "@/lib/repository";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Context) {
  const viewerId = await getCurrentUserId();
  const { id } = await ctx.params;
  const seller = await getUserById(id);

  if (!seller || seller.role !== "SELLER") {
    return NextResponse.json({ error: "Seller not found." }, { status: 404 });
  }

  const [posts, listings] = await Promise.all([
    listSellerCommunityPosts(seller.id, viewerId),
    listSellerCommunityListings(seller.id, viewerId)
  ]);
  return NextResponse.json({ ok: true, posts, listings });
}

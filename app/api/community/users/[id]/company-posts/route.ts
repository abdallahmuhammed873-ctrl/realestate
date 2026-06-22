import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getUserById, listSellerCompanyCommunityListings, listSellerCompanyCommunityPosts } from "@/lib/repository";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Context) {
  const viewerId = await getCurrentUserId();
  const { id } = await ctx.params;
  const seller = await getUserById(id);
  const viewer = await getUserById(viewerId);

  if (!viewer) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (!seller || seller.role !== "SELLER") {
    return NextResponse.json({ error: "Seller not found." }, { status: 404 });
  }

  if (viewer.id !== seller.id && viewer.role !== "ADMIN") {
    return NextResponse.json({ error: "You cannot access this company's posts." }, { status: 403 });
  }

  if (!seller.companyOwnerId && !seller.isCompanyAccount) {
    return NextResponse.json({ error: "Company posts are only available for company sellers." }, { status: 403 });
  }

  const [posts, listings] = await Promise.all([
    listSellerCompanyCommunityPosts(seller.id, viewerId),
    listSellerCompanyCommunityListings(seller.id, viewerId)
  ]);
  return NextResponse.json({ ok: true, posts, listings });
}

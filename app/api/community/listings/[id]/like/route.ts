import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { toggleCommunityListingLike } from "@/lib/repository";

type Context = { params: Promise<{ id: string }> };

export async function POST(_: Request, ctx: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const { id } = await ctx.params;
  const result = await toggleCommunityListingLike(id, userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, listing: result.listing });
}

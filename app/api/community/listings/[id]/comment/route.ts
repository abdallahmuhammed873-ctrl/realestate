import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { addCommunityListingComment } from "@/lib/repository";

type Context = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "");
  const parentCommentId = body.parentCommentId ? String(body.parentCommentId) : null;
  const { id } = await ctx.params;
  const result = await addCommunityListingComment(id, userId, text, parentCommentId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, listing: result.listing });
}

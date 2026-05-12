import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { toggleCommunityPostCommentLike } from "@/lib/repository";

type Context = { params: Promise<{ id: string; commentId: string }> };

export async function POST(_: Request, ctx: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const { id, commentId } = await ctx.params;
  const result = await toggleCommunityPostCommentLike(id, commentId, userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, post: result.post });
}

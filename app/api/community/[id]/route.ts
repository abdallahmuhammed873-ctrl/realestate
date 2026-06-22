import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { deleteCommunityPostForViewer } from "@/lib/repository";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, ctx: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const { id } = await ctx.params;
  const result = await deleteCommunityPostForViewer(id, userId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json({ ok: true });
}

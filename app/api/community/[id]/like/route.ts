import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setCommunityPostReaction } from "@/lib/repository";

type Context = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Context) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const reaction = String(body.reaction ?? "LIKE").toUpperCase();
  const normalized = reaction === "LOVE" ? "LOVE" : "LIKE";
  const { id } = await ctx.params;
  const result = setCommunityPostReaction(id, userId, normalized);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, post: result.post });
}

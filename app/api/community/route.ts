import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { createCommunityPost, getUserById, listCommunityPosts } from "@/lib/repository";

export async function GET() {
  const userId = await getCurrentUserId();
  const viewer = await getUserById(userId);
  const posts = await listCommunityPosts(userId);
  return NextResponse.json({
    ok: true,
    posts,
    canCreatePost: viewer?.role === "SELLER"
  });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "");
  const imagePath = String(body.imagePath ?? body.imageUrl ?? "");
  const result = await createCommunityPost(userId, { text, imagePath });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, post: result.post });
}

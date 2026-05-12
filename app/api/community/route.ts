import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createCommunityPost, getUserById, listCommunityPosts } from "@/lib/repository";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value ?? null;
  const viewer = await getUserById(userId);
  const posts = await listCommunityPosts(userId);
  return NextResponse.json({
    ok: true,
    posts,
    canCreatePost: viewer?.role === "SELLER"
  });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "");
  const imageUrl = String(body.imageUrl ?? "");
  const result = await createCommunityPost(userId, { text, imageUrl });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, post: result.post });
}

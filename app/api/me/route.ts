import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById, updateUserProfile } from "@/lib/repository";
import { toProfileUser, toSessionUser } from "@/lib/sanitize";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  const user = getUserById(userId);
  return NextResponse.json({ user: toSessionUser(user) });
}

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "");
  const email = String(body.email ?? "");
  const phone = String(body.phone ?? "");
  const avatarUrl = body.avatarUrl ? String(body.avatarUrl) : null;
  const result = updateUserProfile(userId, { name, email, phone, avatarUrl });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, user: toProfileUser(result.user) });
}

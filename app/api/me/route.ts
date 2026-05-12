import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getUserById, updateUserProfile } from "@/lib/repository";
import { toProfileUser, toSessionUser } from "@/lib/sanitize";

export async function GET() {
  const userId = await getCurrentUserId();
  const user = await getUserById(userId);
  return NextResponse.json({ user: toSessionUser(user) });
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "");
  const email = String(body.email ?? "");
  const phone = String(body.phone ?? "");
  const avatarUrl = body.avatarUrl ? String(body.avatarUrl) : null;
  const result = await updateUserProfile(userId, { name, email, phone, avatarUrl });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, user: toProfileUser(result.user) });
}

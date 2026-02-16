import { NextRequest, NextResponse } from "next/server";
import { seedUsers } from "@/lib/mock-data";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const role = String(body.role ?? "BUYER");
  const identifier = String(body.identifier ?? "");
  const user = seedUsers.find((u) => u.email === identifier || u.phone === identifier || u.role === role);
  if (!user) return NextResponse.json({ error: "User not found for demo login." }, { status: 404 });
  const res = NextResponse.json({ ok: true, user });
  res.cookies.set("demo_user_id", user.id, { httpOnly: false, sameSite: "lax", path: "/" });
  return res;
}

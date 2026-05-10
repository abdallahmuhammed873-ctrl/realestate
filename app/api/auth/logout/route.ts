import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("demo_user_id", "", { httpOnly: false, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

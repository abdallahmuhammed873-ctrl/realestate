import { NextResponse } from "next/server";
import { clearAuthSessionCookie } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  return clearAuthSessionCookie(res);
}

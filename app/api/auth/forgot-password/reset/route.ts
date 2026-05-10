import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, resetPassword } from "@/lib/repository";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email ?? "").trim();
  const resetToken = String(body.resetToken ?? "").trim();
  const newPassword = String(body.newPassword ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");

  if (!email || !resetToken || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Password and confirmation must match." }, { status: 400 });
  }

  const ok = resetPassword(email, resetToken, newPassword);
  if (!ok) return NextResponse.json({ error: "Invalid or expired reset session." }, { status: 400 });

  const user = findUserByEmail(email);
  const redirectTo = user?.role === "ADMIN" ? "/admin" : user?.role === "SELLER" ? "/seller/dashboard" : "/profile";
  const res = NextResponse.json({ ok: true, message: "Password updated successfully.", redirectTo });
  if (user) {
    res.cookies.set("demo_user_id", user.id, { httpOnly: true, path: "/" });
  }
  return res;
}

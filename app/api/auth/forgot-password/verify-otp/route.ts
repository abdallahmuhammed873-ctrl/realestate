import { NextRequest, NextResponse } from "next/server";
import { verifyPasswordResetOtp } from "@/lib/repository";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email ?? "").trim();
  const otp = String(body.otp ?? "").trim();
  if (!email || !otp) return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });

  const result = await verifyPasswordResetOtp(email, otp);
  if (!result) return NextResponse.json({ error: "Invalid or expired OTP." }, { status: 400 });

  return NextResponse.json({ ok: true, resetToken: result.token });
}

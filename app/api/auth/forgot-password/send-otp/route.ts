import { NextRequest, NextResponse } from "next/server";
import { requestPasswordResetOtp } from "@/lib/repository";
import { sendPasswordResetOtpEmail } from "@/lib/postmark";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim();
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

    const result = await requestPasswordResetOtp(email);
    if (!result) return NextResponse.json({ error: "No account found with this email." }, { status: 404 });

    const mail = await sendPasswordResetOtpEmail({
      to: email,
      userName: result.userName,
      otp: result.otp
    });

    if (!mail.ok) {
      return NextResponse.json({ error: mail.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "OTP sent to your email." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send OTP email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { setAuthSessionCookie } from "@/lib/auth";
import { createUserProfile } from "@/lib/repository";
import { isValidPhoneNumber } from "@/lib/utils";
import { toSessionUser } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phoneNumber = String(body.phoneNumber ?? "").trim();
  const accountType = String(body.accountType ?? "").trim();
  const companyName = String(body.companyName ?? "").trim();
  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");

  const role = accountType === "BUYER" ? "BUYER" : accountType === "SELLER" || accountType === "DEVELOPER" ? "SELLER" : null;
  if (!name || !email || !phoneNumber || !accountType || !role || !password || !confirmPassword) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!isValidPhoneNumber(phoneNumber)) {
    return NextResponse.json({ error: "Phone number must be 11 digits and start with 01." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Password and confirmation must match." }, { status: 400 });
  }
  if (accountType === "DEVELOPER" && !companyName) {
    return NextResponse.json({ error: "Company name is required for developers." }, { status: 400 });
  }

  const user = await createUserProfile({
    name,
    email,
    phone: phoneNumber,
    role,
    isCompanyAccount: accountType === "DEVELOPER",
    password
  });
  if (!user) {
    return NextResponse.json({ error: "Could not create account. Email or phone may already exist." }, { status: 409 });
  }

  const res = NextResponse.json({ ok: true, user: toSessionUser(user) });
  return setAuthSessionCookie(res, user.id);
}

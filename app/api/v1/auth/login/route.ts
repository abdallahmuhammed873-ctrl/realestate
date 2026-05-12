import { NextRequest, NextResponse } from "next/server";
import { issueMobileAccessToken } from "@/lib/mobile-auth";
import { getRequestOrigin, toMobileUser } from "@/lib/mobile-api";
import { findUserByIdentifier, findUserForLogin, verifyUserPassword } from "@/lib/repository";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const roleRaw = body.role ? String(body.role) : "";
  const role = roleRaw === "ADMIN" ? "ADMIN" : roleRaw === "SELLER" ? "SELLER" : roleRaw === "BUYER" ? "BUYER" : null;
  const identifier = String(body.identifier ?? "");
  const password = String(body.password ?? "");

  if (!identifier || !password) {
    return NextResponse.json({ error: "identifier and password are required." }, { status: 400 });
  }

  const user = role ? await findUserForLogin({ role, identifier }) : await findUserByIdentifier(identifier);
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (!(await verifyUserPassword(user.id, password))) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }
  if (user.blocked) {
    return NextResponse.json({ error: "This account is blocked." }, { status: 403 });
  }

  const token = issueMobileAccessToken(user);
  return NextResponse.json({
    ok: true,
    ...token,
    user: toMobileUser(user, { origin: getRequestOrigin(req) })
  });
}

import { NextRequest, NextResponse } from "next/server";
import { setAuthSessionCookie } from "@/lib/auth";
import { findUserByIdentifier, findUserForLogin, verifyUserPassword } from "@/lib/repository";
import { toSessionUser } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const roleRaw = body.role ? String(body.role) : "";
  const role = roleRaw === "ADMIN" ? "ADMIN" : roleRaw === "SELLER" ? "SELLER" : roleRaw === "BUYER" ? "BUYER" : null;
  const identifier = String(body.identifier ?? "");
  const password = String(body.password ?? "");
  const user = role ? await findUserForLogin({ role, identifier }) : await findUserByIdentifier(identifier);
  if (!user) return NextResponse.json({ error: "User not found for demo login." }, { status: 404 });
  if (!(await verifyUserPassword(user.id, password))) return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  if (user.blocked) return NextResponse.json({ error: "This account is blocked." }, { status: 403 });
  const res = NextResponse.json({ ok: true, user: toSessionUser(user) });
  return setAuthSessionCookie(res, user.id);
}

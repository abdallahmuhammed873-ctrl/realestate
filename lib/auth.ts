import type { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/repository";
import { Role } from "@/lib/types";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from "./auth-session.ts";

export async function getCurrentUserId() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
}

export async function getCurrentUser() {
  const userId = await getCurrentUserId();
  return await getUserById(userId);
}

export async function requireRole(roles: Role[]) {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) return null;
  return user;
}

export function setAuthSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(AUTH_COOKIE_NAME, userId, AUTH_COOKIE_OPTIONS);
  return response;
}

export function clearAuthSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 0
  });
  return response;
}

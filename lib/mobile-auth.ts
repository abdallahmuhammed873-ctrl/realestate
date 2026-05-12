import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getUserById } from "./repository.ts";
import type { Role, User } from "./types.ts";

const MOBILE_ACCESS_TOKEN_VERSION = "m1";
const DEFAULT_MOBILE_ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

type MobileAccessTokenPayload = {
  sub: string;
  role: Role;
  exp: number;
  typ: "mobile-access";
};

function getMobileTokenSecret() {
  return process.env.MOBILE_API_TOKEN_SECRET?.trim() || "dev-mobile-api-secret-change-me";
}

function signMobileTokenPayload(payload: string) {
  return createHmac("sha256", getMobileTokenSecret()).update(payload).digest("base64url");
}

function decodeMobileAccessToken(token: string): MobileAccessTokenPayload | null {
  const [version, encodedPayload, signature] = token.split(".");
  if (!version || !encodedPayload || !signature) return null;
  if (version !== MOBILE_ACCESS_TOKEN_VERSION) return null;

  const signedContent = `${version}.${encodedPayload}`;
  const expectedSignature = signMobileTokenPayload(signedContent);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as MobileAccessTokenPayload;
    if (payload.typ !== "mobile-access") return null;
    if (!payload.sub || !payload.role || !payload.exp) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function issueMobileAccessToken(
  user: Pick<User, "id" | "role">,
  ttlSeconds = DEFAULT_MOBILE_ACCESS_TOKEN_TTL_SECONDS
) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload: MobileAccessTokenPayload = {
    sub: user.id,
    role: user.role,
    exp: expiresAt,
    typ: "mobile-access"
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signMobileTokenPayload(`${MOBILE_ACCESS_TOKEN_VERSION}.${encodedPayload}`);

  return {
    accessToken: `${MOBILE_ACCESS_TOKEN_VERSION}.${encodedPayload}.${signature}`,
    tokenType: "Bearer" as const,
    expiresAt: new Date(expiresAt * 1000).toISOString()
  };
}

export function readBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
}

export async function getMobileAuthenticatedUser(request: Request): Promise<User | null> {
  const token = readBearerToken(request);
  if (!token) return null;

  const payload = decodeMobileAccessToken(token);
  if (!payload) return null;

  const user = await getUserById(payload.sub);
  if (!user || user.blocked) return null;
  if (user.role !== payload.role) return null;
  return user;
}

export function unauthorizedMobileResponse(message = "Bearer token required.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

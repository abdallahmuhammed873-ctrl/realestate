export const AUTH_COOKIE_NAME = "demo_user_id";

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: false,
  sameSite: "lax" as const,
  path: "/"
};

import "server-only";
import { cookies, headers } from "next/headers";
import { LANGUAGE_COOKIE, normalizeLanguage, type Language } from "@/lib/i18n";

function pickLanguageFromHeader(value?: string | null): Language {
  if (!value) return "en";
  const first = value.split(",")[0]?.trim() ?? "";
  if (first.toLowerCase().startsWith("ar")) return "ar";
  return "en";
}

export async function getRequestLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LANGUAGE_COOKIE)?.value;
  if (cookieValue) return normalizeLanguage(cookieValue);
  const headerValue = (await headers()).get("accept-language");
  return pickLanguageFromHeader(headerValue);
}

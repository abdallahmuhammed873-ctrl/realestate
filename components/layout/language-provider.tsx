"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  commonDictionary,
  getLanguageDirection,
  LANGUAGE_COOKIE,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  type CommonTranslationKey,
  type Direction,
  type Language
} from "@/lib/i18n";

type LanguageContextValue = {
  language: Language;
  direction: Direction;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: CommonTranslationKey, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function resolveNavigatorLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const browserLanguage = window.navigator.language?.toLowerCase() ?? "";
  return browserLanguage.startsWith("ar") ? "ar" : "en";
}

function applyLanguage(language: Language) {
  document.documentElement.lang = language;
  document.documentElement.dir = getLanguageDirection(language);
  document.documentElement.dataset.language = language;
}

function persistLanguage(language: Language) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/; max-age=31536000; samesite=lax`;
}

type LanguageProviderProps = {
  children: React.ReactNode;
  initialLanguage: Language;
};

export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  const router = useRouter();
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const nextLanguage = stored ? normalizeLanguage(stored) : initialLanguage || resolveNavigatorLanguage();
    setLanguageState(nextLanguage);
    applyLanguage(nextLanguage);
  }, [initialLanguage]);

  useEffect(() => {
    applyLanguage(language);
    persistLanguage(language);
  }, [language]);

  function setLanguage(language: Language) {
    setLanguageState(language);
    applyLanguage(language);
    persistLanguage(language);
    router.refresh();
  }

  const value = useMemo(
    () => ({
      language,
      direction: getLanguageDirection(language),
      setLanguage,
      toggleLanguage: () => setLanguage(language === "ar" ? "en" : "ar"),
      t: (key: CommonTranslationKey, params?: Record<string, string | number>) => {
        const template = commonDictionary[key]?.[language] ?? commonDictionary[key]?.en ?? String(key);
        if (!params) return template;

        return Object.entries(params).reduce(
          (result, [paramKey, paramValue]) => result.replaceAll(`{${paramKey}}`, String(paramValue)),
          template
        );
      }
    }),
    [language, router]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function LanguageScript() {
  const script = `
    (function () {
      try {
        var stored = window.localStorage.getItem("${LANGUAGE_STORAGE_KEY}");
        var cookieMatch = document.cookie.match(/(?:^|; )${LANGUAGE_COOKIE}=([^;]+)/);
        var cookieValue = cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";
        var language = stored === "ar" || stored === "en"
          ? stored
          : (cookieValue === "ar" || cookieValue === "en"
            ? cookieValue
            : (navigator.language && navigator.language.toLowerCase().startsWith("ar") ? "ar" : "en"));
        document.documentElement.lang = language;
        document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
        document.documentElement.dataset.language = language;
      } catch (error) {
        document.documentElement.lang = "en";
        document.documentElement.dir = "ltr";
        document.documentElement.dataset.language = "en";
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider.");
  return context;
}

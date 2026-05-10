"use client";

import { createContext, useContext, useMemo } from "react";
import { commonDictionary, CommonTranslationKey, Language } from "@/lib/i18n";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: CommonTranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language: Language = "en";
  const setLanguage = () => undefined;

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => undefined,
      t: (key: CommonTranslationKey) => commonDictionary[key][language]
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider.");
  return context;
}

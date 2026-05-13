"use client";

import { useLanguage } from "@/components/layout/language-provider";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, toggleLanguage, t } = useLanguage();
  const nextLabel = language === "ar" ? t("switchToEnglish") : t("switchToArabic");

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={
        compact
          ? "rounded-xl border theme-divider bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface-soft)]"
          : "rounded-xl border theme-divider bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-soft)]"
      }
      aria-label={t("languageToggleLabel")}
      title={t("languageToggleLabel")}
    >
      {nextLabel}
    </button>
  );
}

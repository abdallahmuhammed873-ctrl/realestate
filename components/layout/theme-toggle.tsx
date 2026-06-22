"use client";

import { useLanguage } from "@/components/layout/language-provider";
import { useTheme } from "@/components/layout/theme-provider";

function ThemeGlyph({ dark }: { dark: boolean }) {
  return dark ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.5 17.5l1.57 1.57M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.5 6.5l1.57-1.57" />
    </svg>
  );
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = nextTheme === "dark" ? t("switchToDarkMode") : t("switchToLightMode");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={
        compact
          ? "inline-flex h-9 w-9 items-center justify-center rounded-full border theme-divider bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-soft)]"
          : "inline-flex items-center gap-2 rounded-xl border theme-divider bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-soft)]"
      }
    >
      <ThemeGlyph dark={theme === "dark"} />
      {compact ? null : <span>{theme === "dark" ? t("darkMode") : t("lightMode")}</span>}
    </button>
  );
}

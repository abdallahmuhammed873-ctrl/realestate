import Link from "next/link";
import { getRequestLanguage } from "@/lib/i18n-server";
import { getLanguageDirection, t } from "@/lib/i18n";

const APP_STORE_URL = "#";
const GOOGLE_PLAY_URL = "#";

const SOCIAL_LINKS = {
  instagram: "#",
  facebook: "#",
  x: "#",
  linkedin: "#"
} as const;

function SocialIcon({
  label,
  href,
  title,
  children
}: {
  label: string;
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  const isPlaceholder = href === "#";
  const className =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl border theme-divider bg-[var(--surface)] text-[var(--muted)] shadow-sm hover:text-[var(--brand)]";

  if (isPlaceholder) {
    return (
      <span aria-label={label} title={title} className={`${className} cursor-not-allowed opacity-60`}>
        {children}
      </span>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={title} className={className}>
      {children}
    </a>
  );
}

export async function Footer() {
  const language = await getRequestLanguage();
  const direction = getLanguageDirection(language);
  const year = new Date().getFullYear();
  const appStoreComingSoon = APP_STORE_URL === "#";
  const googlePlayComingSoon = GOOGLE_PLAY_URL === "#";
  const appStoreLabel = t(language, "appStore");
  const googlePlayLabel = t(language, "googlePlay");

  return (
    <footer className="border-t theme-divider bg-[var(--surface-elevated)] backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-12 md:gap-10 md:px-6 md:py-12">
        <div className="md:col-span-5">
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-extrabold text-brand-800">
            <span className="rounded-lg bg-[var(--cheque)] px-2 py-1 text-[var(--cheque-ink)]">CK</span>
            Cheque &amp; Key
          </Link>
          <p className="text-muted mt-2 text-sm">{t(language, "appDescription")}</p>

          <div className="mt-5 flex flex-wrap gap-3">
            {appStoreComingSoon ? (
              <span
                className={`inline-flex cursor-not-allowed items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white opacity-60 shadow-sm ${direction === "rtl" ? "text-right" : "text-left"}`}
                aria-label={t(language, "appStoreAria")}
                title={t(language, "linkComingSoon", { label: appStoreLabel })}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-white">
                  <path d="M16.7 12.6c0 2.6 2.3 3.5 2.3 3.5s-1.7 4.9-4 4.9c-1.1 0-1.9-.7-3-.7-1.1 0-2.1.7-3 .7-2.1.1-4.2-4.2-4.2-7.6 0-3.5 2.3-5.3 4.4-5.3 1.1 0 2.1.7 2.9.7.8 0 2-.8 3.4-.7.6 0 2.4.2 3.5 1.8-.1.1-2.1 1.2-2.1 3.4Zm-2.4-6c.6-.8 1-1.9.9-3.1-.9.1-2 .6-2.6 1.4-.6.7-1.1 1.9-.9 3 .9.1 2-.5 2.6-1.3Z" />
                </svg>
                <span className="leading-tight">
                  <span className="block text-[11px] text-slate-200">{t(language, "downloadOnThe")}</span>
                  <span className="block text-sm font-semibold">{appStoreLabel}</span>
                </span>
              </span>
            ) : (
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-sm hover:bg-slate-800 ${direction === "rtl" ? "text-right" : "text-left"}`}
                aria-label={t(language, "appStoreAria")}
                title={t(language, "appStoreAria")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-white">
                  <path d="M16.7 12.6c0 2.6 2.3 3.5 2.3 3.5s-1.7 4.9-4 4.9c-1.1 0-1.9-.7-3-.7-1.1 0-2.1.7-3 .7-2.1.1-4.2-4.2-4.2-7.6 0-3.5 2.3-5.3 4.4-5.3 1.1 0 2.1.7 2.9.7.8 0 2-.8 3.4-.7.6 0 2.4.2 3.5 1.8-.1.1-2.1 1.2-2.1 3.4Zm-2.4-6c.6-.8 1-1.9.9-3.1-.9.1-2 .6-2.6 1.4-.6.7-1.1 1.9-.9 3 .9.1 2-.5 2.6-1.3Z" />
                </svg>
                <span className="leading-tight">
                  <span className="block text-[11px] text-slate-200">{t(language, "downloadOnThe")}</span>
                  <span className="block text-sm font-semibold">{appStoreLabel}</span>
                </span>
              </a>
            )}

            {googlePlayComingSoon ? (
              <span
                className={`inline-flex cursor-not-allowed items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white opacity-60 shadow-sm ${direction === "rtl" ? "text-right" : "text-left"}`}
                aria-label={t(language, "googlePlayAria")}
                title={t(language, "linkComingSoon", { label: googlePlayLabel })}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-white">
                  <path d="M3.9 2.9c-.5.3-.9.9-.9 1.7v14.8c0 .8.4 1.4.9 1.7l.1.1 8.6-8.6v-.2L4 2.8l-.1.1Zm10 10.1 2.2-2.2-2.7-1.5-6-3.4 6.5 6.5Zm.6.6-6.5 6.5 6.1-3.5 2.6-1.5-2.2-2.2Zm3-3.5-2.5 2.5 2.5 2.5 3.1-1.8c.9-.5.9-1.4 0-1.9l-3.1-1.8Z" />
                </svg>
                <span className="leading-tight">
                  <span className="block text-[11px] text-slate-200">{t(language, "getItOn")}</span>
                  <span className="block text-sm font-semibold">{googlePlayLabel}</span>
                </span>
              </span>
            ) : (
              <a
                href={GOOGLE_PLAY_URL}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-sm hover:bg-slate-800 ${direction === "rtl" ? "text-right" : "text-left"}`}
                aria-label={t(language, "googlePlayAria")}
                title={t(language, "googlePlayAria")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-white">
                  <path d="M3.9 2.9c-.5.3-.9.9-.9 1.7v14.8c0 .8.4 1.4.9 1.7l.1.1 8.6-8.6v-.2L4 2.8l-.1.1Zm10 10.1 2.2-2.2-2.7-1.5-6-3.4 6.5 6.5Zm.6.6-6.5 6.5 6.1-3.5 2.6-1.5-2.2-2.2Zm3-3.5-2.5 2.5 2.5 2.5 3.1-1.8c.9-.5.9-1.4 0-1.9l-3.1-1.8Z" />
                </svg>
                <span className="leading-tight">
                  <span className="block text-[11px] text-slate-200">{t(language, "getItOn")}</span>
                  <span className="block text-sm font-semibold">{googlePlayLabel}</span>
                </span>
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm md:col-span-4 md:grid-cols-2">
          <div>
            <p className="font-semibold text-[var(--ink)]">{t(language, "explore")}</p>
            <ul className="text-muted mt-3 space-y-2">
              <li>
                <Link className="hover:text-brand-700" href="/about">
                  {t(language, "aboutUs")}
                </Link>
              </li>
              <li>
                <Link className="hover:text-brand-700" href="/search">
                  {t(language, "search")}
                </Link>
              </li>
              <li>
                <Link className="hover:text-brand-700" href="/community">
                  {t(language, "community")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-[var(--ink)]">{t(language, "account")}</p>
            <ul className="text-muted mt-3 space-y-2">
              <li>
                <Link className="hover:text-brand-700" href="/auth">
                  {t(language, "login")}
                </Link>
              </li>
              <li>
                <Link className="hover:text-brand-700" href="/profile">
                  {t(language, "profile")}
                </Link>
              </li>
              <li>
                <Link className="hover:text-brand-700" href="/notifications">
                  {t(language, "notifications")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className={`md:col-span-3 ${direction === "rtl" ? "md:text-left" : "md:text-right"}`}>
          <p className="text-sm font-semibold text-[var(--ink)]">{t(language, "followUs")}</p>
          <div className={`mt-3 flex gap-3 ${direction === "rtl" ? "md:justify-start" : "md:justify-end"}`}>
            <SocialIcon label="Instagram" href={SOCIAL_LINKS.instagram} title="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9A3.5 3.5 0 0 0 20 16.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm10 1.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
              </svg>
            </SocialIcon>
            <SocialIcon label="Facebook" href={SOCIAL_LINKS.facebook} title="Facebook">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                <path d="M13.5 22v-8h2.7l.4-3H13.5V9.1c0-.9.3-1.5 1.6-1.5h1.7V5c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6V11H7v3h2.6v8h3.9Z" />
              </svg>
            </SocialIcon>
            <SocialIcon label="X" href={SOCIAL_LINKS.x} title="X">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.8-6.4L6.3 22H3.2l7.3-8.4L1 2h6.3l4.3 5.7L18.9 2Zm-1.1 18h1.7L6.2 3.9H4.4L17.8 20Z" />
              </svg>
            </SocialIcon>
            <SocialIcon label="LinkedIn" href={SOCIAL_LINKS.linkedin} title="LinkedIn">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.6h.1c.5-1 1.9-2 3.9-2 4.2 0 5 2.7 5 6.2V21h-4v-5.4c0-1.3 0-3-1.9-3s-2.2 1.4-2.2 2.9V21h-4V9Z" />
              </svg>
            </SocialIcon>
          </div>

          <p className="text-muted mt-6 text-sm">&copy; {year} Cheque &amp; Key.</p>
        </div>
      </div>

      <div className="border-t theme-divider">
        <div className="text-soft mx-auto flex max-w-7xl items-center justify-between px-4 py-4 pb-24 text-xs md:px-6 md:pb-4">
          <p>{t(language, "thankYou")}</p>
        </div>
      </div>
    </footer>
  );
}

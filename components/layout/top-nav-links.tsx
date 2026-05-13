"use client";

import Link from "next/link";
import { useLanguage } from "@/components/layout/language-provider";
import { NotificationBell } from "@/components/layout/notification-bell";
import { AppointmentsLink } from "@/components/layout/appointments-link";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type TopNavUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string | null;
  role: "BUYER" | "SELLER" | "ADMIN";
  isCompanyAccount?: boolean;
};

export function TopNavLinks({ user }: { user: TopNavUser | null }) {
  const { t } = useLanguage();

  return (
    <nav className="hidden items-center gap-4 text-sm text-[var(--muted)] md:flex">
      <Link href="/search" className="hover:text-[var(--ink)]">
        {t("search")}
      </Link>
      <NotificationBell />
      <AppointmentsLink />
      <Link href="/favorites" className="hover:text-[var(--ink)]">
        {t("favorites")}
      </Link>
      <Link href="/compare" className="hover:text-[var(--ink)]">
        {t("compare")}
      </Link>
      <Link href="/community" className="hover:text-[var(--ink)]">
        {t("community")}
      </Link>
      {user?.role === "SELLER" ? (
        <Link href="/seller/dashboard" className="hover:text-[var(--ink)]">
          {t("seller")}
        </Link>
      ) : null}
      {user?.role === "ADMIN" ? (
        <Link href="/admin" className="hover:text-[var(--ink)]">
          {t("admin")}
        </Link>
      ) : null}
      <LanguageToggle />
      <ThemeToggle />
      {user ? (
        <>
          <ProfileMenu user={user} />
          <LogoutButton redirectTo={user.role === "ADMIN" ? "/admin/login" : "/auth"} />
        </>
      ) : (
        <Link href="/auth" className="rounded-xl border theme-divider bg-[var(--surface)] px-3 py-1.5 text-[var(--ink)] hover:bg-[var(--surface-soft)]">
          {t("login")}
        </Link>
      )}
    </nav>
  );
}

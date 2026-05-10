"use client";

import Link from "next/link";
import { useLanguage } from "@/components/layout/language-provider";
import { NotificationBell } from "@/components/layout/notification-bell";
import { LogoutButton } from "@/components/layout/logout-button";
import { ProfileMenu } from "@/components/layout/profile-menu";

type TopNavUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "BUYER" | "SELLER" | "ADMIN";
  isCompanyAccount?: boolean;
};

export function TopNavLinks({ user }: { user: TopNavUser | null }) {
  const { t } = useLanguage();

  return (
    <nav className="hidden items-center gap-4 text-sm md:flex">
      <Link href="/search">{t("search")}</Link>
      <NotificationBell />
      <Link href="/appointments">{t("appointments")}</Link>
      <Link href="/favorites">{t("favorites")}</Link>
      <Link href="/compare">{t("compare")}</Link>
      <Link href="/community">{t("community")}</Link>
      {user?.role === "SELLER" ? <Link href="/seller/dashboard">{t("seller")}</Link> : null}
      {user?.role === "ADMIN" ? <Link href="/admin">{t("admin")}</Link> : null}
      {user ? (
        <>
          <ProfileMenu user={user} />
          <LogoutButton redirectTo={user.role === "ADMIN" ? "/admin/login" : "/auth"} />
        </>
      ) : (
        <Link href="/auth" className="rounded-xl border px-3 py-1.5">
          {t("login")}
        </Link>
      )}
    </nav>
  );
}

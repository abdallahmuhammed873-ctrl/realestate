"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/layout/language-provider";

type ProfileMenuUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string | null;
  role: "BUYER" | "SELLER" | "ADMIN";
  isCompanyAccount?: boolean;
};

export function ProfileMenu({ user }: { user: ProfileMenuUser }) {
  const { direction, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = (user.name.trim().charAt(0) || "U").toUpperCase();
  const roleLabel =
    user.role === "SELLER" && user.isCompanyAccount
      ? t("developer")
      : user.role === "SELLER"
        ? t("seller")
        : user.role === "ADMIN"
          ? t("admin")
          : t("buyer");

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border theme-divider bg-[var(--surface)] text-sm font-bold text-[var(--brand)]"
        aria-label={t("openProfileMenu")}
      >
        {user.avatarUrl ? <img src={user.avatarUrl} alt={`${user.name} avatar`} className="h-full w-full object-cover" /> : initial}
      </button>

      {open ? (
        <div className={`surface-panel absolute top-full z-50 mt-2 w-72 rounded-xl p-3 ${direction === "rtl" ? "left-0" : "right-0"}`}>
          <p className="text-soft text-xs font-semibold uppercase tracking-wide">{roleLabel}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p className="font-semibold text-[var(--ink)]">{user.name}</p>
            <p className="text-muted">{user.email}</p>
            <p className="text-muted">{user.phone ?? t("noPhoneAdded")}</p>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border theme-divider px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-soft)]"
          >
            {t("showProfile")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

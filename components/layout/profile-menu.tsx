"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/layout/language-provider";

type ProfileMenuUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "BUYER" | "SELLER" | "ADMIN";
  isCompanyAccount?: boolean;
};

export function ProfileMenu({ user }: { user: ProfileMenuUser }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = (user.name.trim().charAt(0) || "U").toUpperCase();
  const avatarKey = `profile_avatar_${user.id}`;
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

  useEffect(() => {
    const loadAvatar = () => setAvatarUrl(localStorage.getItem(avatarKey));
    const onAvatarChanged = (e: Event) => {
      const custom = e as CustomEvent<{ userId?: string }>;
      if (custom.detail?.userId && custom.detail.userId !== user.id) return;
      loadAvatar();
    };
    loadAvatar();
    window.addEventListener("storage", loadAvatar);
    window.addEventListener("profile:avatar-changed", onAvatarChanged as EventListener);
    return () => {
      window.removeEventListener("storage", loadAvatar);
      window.removeEventListener("profile:avatar-changed", onAvatarChanged as EventListener);
    };
  }, [avatarKey, user.id]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-white text-sm font-bold text-brand-800"
        aria-label={t("openProfileMenu")}
      >
        {avatarUrl ? <img src={avatarUrl} alt={`${user.name} avatar`} className="h-full w-full object-cover" /> : initial}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{roleLabel}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p className="font-semibold text-slate-900">{user.name}</p>
            <p className="text-slate-700">{user.email}</p>
            <p className="text-slate-700">{user.phone ?? t("noPhoneAdded")}</p>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            {t("showProfile")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

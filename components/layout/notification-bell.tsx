"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/layout/language-provider";

export function NotificationBell() {
  const { direction, t } = useLanguage();
  const [unread, setUnread] = useState(0);

  async function refreshUnread() {
    try {
      const res = await fetch("/api/notifications/unread", { cache: "no-store" });
      const data = await res.json();
      setUnread(Number(data.unread ?? 0));
    } catch {
      setUnread(0);
    }
  }

  useEffect(() => {
    refreshUnread();
    const onFocus = () => refreshUnread();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshUnread();
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshUnread();
    }, 8000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      refreshUnread();
    };
    window.addEventListener("notifications:changed", handler as EventListener);
    return () => window.removeEventListener("notifications:changed", handler as EventListener);
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border theme-divider text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]"
      aria-label={t("notifications")}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
        <path d="M10 17a2 2 0 0 0 4 0" />
      </svg>
      {unread > 0 && (
        <span className={`absolute -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-5 text-white ${direction === "rtl" ? "-left-1" : "-right-1"}`}>
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

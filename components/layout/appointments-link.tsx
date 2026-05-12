"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/layout/language-provider";

export function AppointmentsLink() {
  const { t } = useLanguage();
  const [unread, setUnread] = useState(0);

  async function refreshUnread() {
    try {
      const res = await fetch("/api/appointments/unread", { cache: "no-store" });
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
    const handler = () => refreshUnread();
    window.addEventListener("appointments:changed", handler as EventListener);
    return () => window.removeEventListener("appointments:changed", handler as EventListener);
  }, []);

  return (
    <Link href="/appointments" className="relative inline-flex items-center">
      <span>{t("appointments")}</span>
      {unread > 0 ? (
        <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-5 text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}


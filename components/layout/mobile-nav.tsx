"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/components/layout/language-provider";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [unread, setUnread] = useState(0);
  const [unreadAppointments, setUnreadAppointments] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const baseTabs = [
    { href: "/", label: t("home") },
    { href: "/search", label: t("search") },
    { href: "/notifications", label: t("notify") },
    { href: "/appointments", label: t("appointments") },
    { href: "/favorites", label: t("favorites") },
    { href: "/compare", label: t("compare") },
    { href: "/community", label: t("community") }
  ];

  useEffect(() => {
    let mounted = true;
    const loadUnread = () => {
      fetch("/api/notifications/unread", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (mounted) setUnread(Number(data.unread ?? 0));
        })
        .catch(() => undefined);
    };
    const loadUnreadAppointments = () => {
      fetch("/api/appointments/unread", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (mounted) setUnreadAppointments(Number(data.unread ?? 0));
        })
        .catch(() => undefined);
    };
    const loadSession = () => {
      fetch("/api/me")
        .then((r) => r.json())
        .then((data) => {
          if (!mounted) return;
          const nextRole = data?.user?.role ?? null;
          setRole(nextRole);
          setIsLoggedIn(Boolean(data?.user));
        })
        .catch(() => {
          if (!mounted) return;
          setRole(null);
          setIsLoggedIn(false);
        });
    };
    const loadAll = () => {
      loadUnread();
      loadUnreadAppointments();
      loadSession();
    };
    loadAll();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadUnread();
        loadUnreadAppointments();
      }
    }, 8000);
    window.addEventListener("focus", loadAll);
    return () => {
      window.removeEventListener("focus", loadAll);
      window.clearInterval(timer);
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      fetch("/api/notifications/unread", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => setUnread(Number(data.unread ?? 0)))
        .catch(() => undefined);
    };
    window.addEventListener("notifications:changed", handler as EventListener);
    return () => window.removeEventListener("notifications:changed", handler as EventListener);
  }, []);

  useEffect(() => {
    const handler = () => {
      fetch("/api/appointments/unread", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => setUnreadAppointments(Number(data.unread ?? 0)))
        .catch(() => undefined);
    };
    window.addEventListener("appointments:changed", handler as EventListener);
    return () => window.removeEventListener("appointments:changed", handler as EventListener);
  }, []);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setRole(null);
      setIsLoggedIn(false);
      router.push(role === "ADMIN" ? "/admin/login" : "/auth");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const tabs =
    role === "SELLER"
      ? [...baseTabs, { href: "/seller/dashboard", label: t("seller") }]
      : role === "ADMIN"
        ? [...baseTabs, { href: "/admin", label: t("admin") }]
        : baseTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t theme-divider bg-[var(--surface-elevated)] backdrop-blur md:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              className={cn(
                "block px-2 py-3 text-center text-xs",
                pathname === tab.href ? "font-bold text-[var(--brand)]" : "text-[var(--muted)]"
              )}
            >
              {tab.href === "/notifications" && unread > 0
                ? `${tab.label} (${unread})`
                : tab.href === "/appointments" && unreadAppointments > 0
                  ? `${tab.label} (${unreadAppointments})`
                  : tab.label}
            </Link>
          </li>
        ))}
        <li>
          {isLoggedIn ? (
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className={cn(
                "block w-full px-2 py-3 text-center text-xs",
                pathname === "/auth" ? "font-bold text-[var(--brand)]" : "text-[var(--muted)]"
              )}
            >
              {loggingOut ? t("loggingOut") : t("logout")}
            </button>
          ) : (
            <Link
              href="/auth"
              className={cn(
                "block px-2 py-3 text-center text-xs",
                pathname === "/auth" ? "font-bold text-[var(--brand)]" : "text-[var(--muted)]"
              )}
            >
              {t("login")}
            </Link>
          )}
        </li>
      </ul>
      <div className="flex justify-center border-t theme-divider px-4 py-2">
        <ThemeToggle compact />
      </div>
    </nav>
  );
}

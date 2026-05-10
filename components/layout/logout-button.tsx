"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/layout/language-provider";
import { Button } from "@/components/ui/button";

export function LogoutButton({ redirectTo = "/auth" }: { redirectTo?: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  async function logout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push(redirectTo);
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" className="px-3 py-1.5" onClick={logout} disabled={loading}>
      {loading ? t("loggingOut") : t("logout")}
    </Button>
  );
}

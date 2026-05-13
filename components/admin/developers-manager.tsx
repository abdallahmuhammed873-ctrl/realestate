"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isValidPhoneNumber } from "@/lib/utils";
import { useLanguage } from "@/components/layout/language-provider";

type DeveloperItem = {
  developer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    blocked?: boolean;
  };
  stats: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
};

export function DevelopersManager({ initialItems }: { initialItems: DeveloperItem[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [searchName, setSearchName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const normalizedSearchName = searchName.trim().toLowerCase();
  const visibleItems = normalizedSearchName.length === 0 ? items : items.filter(({ developer }) => developer.name.toLowerCase().includes(normalizedSearchName));

  async function refreshItems() {
    const res = await fetch("/api/admin/developers");
    if (!res.ok) return;
    const data = await res.json();
    setItems(Array.isArray(data.items) ? data.items : []);
    router.refresh();
  }

  async function addDeveloper() {
    setError("");
    if (!name.trim() || !email.trim()) {
      setError(t("addBuyerValidation"));
      return;
    }
    if (password.length < 6) {
      setError(t("passwordMinValidation"));
      return;
    }
    if (phone.trim() && !isValidPhoneNumber(phone)) {
      setError(t("phoneValidation"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/developers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("addDeveloperFailed"));
        return;
      }
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      await refreshItems();
    } finally {
      setSaving(false);
    }
  }

  async function setBlocked(id: string, action: "BLOCK" | "UNBLOCK") {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/developers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("updateDeveloperFailed"));
        return;
      }
      await refreshItems();
    } finally {
      setBusyId(null);
    }
  }

  async function removeDeveloper(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/developers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("removeDeveloperFailed"));
        return;
      }
      await refreshItems();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-bold">{t("addDeveloper")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("createDeveloperManually")}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <Input placeholder={t("developerName")} value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="email" placeholder={t("developerEmail")} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          <Input
            type="tel"
            placeholder={t("developerPhoneOptional")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="off"
            pattern="01[0-9]{9}"
            minLength={11}
            maxLength={11}
            title={t("phoneValidation")}
          />
          <Input type="text" placeholder={t("developerPassword")} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" minLength={6} />
        </div>
        <div className="mt-3">
          <Button onClick={addDeveloper} disabled={saving}>
            {saving ? t("saving") : t("addDeveloper")}
          </Button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </Card>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">{t("noDeveloperProfiles")}</p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">{t("searchTitle")}</h2>
                <p className="mt-1 text-sm text-slate-600">{t("searchDevelopersByName")}</p>
              </div>
              <div className="flex w-full gap-2 sm:w-[420px]">
                <Input placeholder={t("searchDeveloperName")} value={searchName} onChange={(e) => setSearchName(e.target.value)} />
                <Button variant="outline" onClick={() => setSearchName("")} disabled={!searchName.trim()}>
                  {t("clearSearch")}
                </Button>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-600">{t("showingResults", { visible: visibleItems.length, total: items.length })}</p>
          </Card>

          {visibleItems.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-600">{t("noDevelopersMatch", { value: searchName.trim() })}</p>
            </Card>
          ) : (
            visibleItems.map(({ developer, stats }) => (
              <Card key={developer.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-lg font-bold">{developer.name}</p>
                    <p className="text-sm text-slate-600">{developer.email}</p>
                    <p className="text-sm text-slate-600">{developer.phone ?? t("noPhoneProvided")}</p>
                    <p className={`text-xs font-semibold ${developer.blocked ? "text-red-600" : "text-emerald-600"}`}>{developer.blocked ? t("blocked") : t("active")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/developers/${developer.id}`} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                      {t("openProfile")}
                    </Link>
                    {developer.blocked ? (
                      <Button variant="outline" onClick={() => void setBlocked(developer.id, "UNBLOCK")} disabled={busyId === developer.id}>
                        {t("unblock")}
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => void setBlocked(developer.id, "BLOCK")} disabled={busyId === developer.id}>
                        {t("block")}
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => void removeDeveloper(developer.id)} disabled={busyId === developer.id}>
                      {t("remove")}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                  <p className="rounded-lg bg-slate-50 px-3 py-2">{t("totalStat", { count: stats.total })}</p>
                  <p className="rounded-lg bg-slate-50 px-3 py-2">{t("approvedStat", { count: stats.approved })}</p>
                  <p className="rounded-lg bg-slate-50 px-3 py-2">{t("pendingStat", { count: stats.pending })}</p>
                  <p className="rounded-lg bg-slate-50 px-3 py-2">{t("rejectedStat", { count: stats.rejected })}</p>
                </div>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
}

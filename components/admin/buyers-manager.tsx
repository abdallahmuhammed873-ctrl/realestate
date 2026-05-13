"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isValidPhoneNumber } from "@/lib/utils";
import { useLanguage } from "@/components/layout/language-provider";

type BuyerItem = {
  buyer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    blocked?: boolean;
  };
  stats: {
    favorites: number;
    appointments: number;
    savedSearches: number;
  };
};

export function BuyersManager({ initialItems }: { initialItems: BuyerItem[] }) {
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
  const visibleItems = normalizedSearchName.length === 0 ? items : items.filter(({ buyer }) => buyer.name.toLowerCase().includes(normalizedSearchName));

  async function refreshItems() {
    const res = await fetch("/api/admin/buyers");
    if (!res.ok) return;
    const data = await res.json();
    setItems(Array.isArray(data.items) ? data.items : []);
    router.refresh();
  }

  async function addBuyer() {
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
      const res = await fetch("/api/admin/buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("addBuyerFailed"));
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
      const res = await fetch(`/api/admin/buyers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("updateBuyerFailed"));
        return;
      }
      await refreshItems();
    } finally {
      setBusyId(null);
    }
  }

  async function removeBuyer(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/buyers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("removeBuyerFailed"));
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
        <h2 className="text-lg font-bold">{t("addBuyer")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("createBuyerManually")}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <Input placeholder={t("buyerName")} value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="email" placeholder={t("buyerEmail")} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          <Input
            type="tel"
            placeholder={t("buyerPhoneOptional")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="off"
            pattern="01[0-9]{9}"
            minLength={11}
            maxLength={11}
            title={t("phoneValidation")}
          />
          <Input type="text" placeholder={t("buyerPassword")} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" minLength={6} />
        </div>
        <div className="mt-3">
          <Button onClick={addBuyer} disabled={saving}>
            {saving ? t("saving") : t("addBuyer")}
          </Button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </Card>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">{t("noBuyerProfiles")}</p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">{t("searchTitle")}</h2>
                <p className="mt-1 text-sm text-slate-600">{t("searchBuyersByName")}</p>
              </div>
              <div className="flex w-full gap-2 sm:w-[420px]">
                <Input placeholder={t("searchBuyerName")} value={searchName} onChange={(e) => setSearchName(e.target.value)} />
                <Button variant="outline" onClick={() => setSearchName("")} disabled={!searchName.trim()}>
                  {t("clearSearch")}
                </Button>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-600">{t("showingResults", { visible: visibleItems.length, total: items.length })}</p>
          </Card>

          {visibleItems.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-600">{t("noBuyersMatch", { value: searchName.trim() })}</p>
            </Card>
          ) : (
            visibleItems.map(({ buyer, stats }) => (
              <Card key={buyer.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-lg font-bold">{buyer.name}</p>
                    <p className="text-sm text-slate-600">{buyer.email}</p>
                    <p className="text-sm text-slate-600">{buyer.phone ?? t("noPhoneProvided")}</p>
                    <p className={`text-xs font-semibold ${buyer.blocked ? "text-red-600" : "text-emerald-600"}`}>{buyer.blocked ? t("blocked") : t("active")}</p>
                  </div>
                  <div className="flex gap-2">
                    {buyer.blocked ? (
                      <Button variant="outline" onClick={() => void setBlocked(buyer.id, "UNBLOCK")} disabled={busyId === buyer.id}>
                        {t("unblock")}
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => void setBlocked(buyer.id, "BLOCK")} disabled={busyId === buyer.id}>
                        {t("block")}
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => void removeBuyer(buyer.id)} disabled={busyId === buyer.id}>
                      {t("remove")}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                  <p className="rounded-lg bg-slate-50 px-3 py-2">{t("favoritesStat", { count: stats.favorites })}</p>
                  <p className="rounded-lg bg-slate-50 px-3 py-2">{t("appointmentsStat", { count: stats.appointments })}</p>
                  <p className="rounded-lg bg-slate-50 px-3 py-2">{t("savedSearchesStat", { count: stats.savedSearches })}</p>
                </div>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
}

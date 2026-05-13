"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isValidPhoneNumber } from "@/lib/utils";
import { useLanguage } from "@/components/layout/language-provider";

type SellerItem = {
  seller: {
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

export function SellersManager({ initialItems }: { initialItems: SellerItem[] }) {
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
  const visibleItems = normalizedSearchName.length === 0 ? items : items.filter(({ seller }) => seller.name.toLowerCase().includes(normalizedSearchName));

  async function refreshItems() {
    const res = await fetch("/api/admin/sellers");
    if (!res.ok) return;
    const data = await res.json();
    setItems(Array.isArray(data.items) ? data.items : []);
    router.refresh();
  }

  async function addSeller() {
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
      const res = await fetch("/api/admin/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("addUserFailed"));
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
      const res = await fetch(`/api/admin/sellers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("updateUserFailed"));
        return;
      }
      await refreshItems();
    } finally {
      setBusyId(null);
    }
  }

  async function removeSeller(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/sellers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("failedToDeleteListing"));
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
        <h2 className="text-lg font-bold">{t("addUserTitle")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("createSellerManually")}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <Input placeholder={t("userName")} value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="email" placeholder={t("userEmailLabel")} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          <Input
            type="tel"
            placeholder={t("userPhoneOptional")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="off"
            pattern="01[0-9]{9}"
            minLength={11}
            maxLength={11}
            title={t("phoneValidation")}
          />
          <Input type="text" placeholder={t("userPasswordLabel")} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" minLength={6} />
        </div>
        <div className="mt-3">
          <Button onClick={addSeller} disabled={saving}>
            {saving ? t("saving") : t("addUser")}
          </Button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </Card>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">{t("noSellerProfiles")}</p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">{t("searchTitle")}</h2>
                <p className="mt-1 text-sm text-slate-600">{t("searchSellersByName")}</p>
              </div>
              <div className="flex w-full gap-2 sm:w-[420px]">
                <Input placeholder={t("searchSellerName")} value={searchName} onChange={(e) => setSearchName(e.target.value)} />
                <Button variant="outline" onClick={() => setSearchName("")} disabled={!searchName.trim()}>
                  {t("clearSearch")}
                </Button>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-600">{t("showingResults", { visible: visibleItems.length, total: items.length })}</p>
          </Card>

          {visibleItems.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-600">{t("noSellersMatch", { value: searchName.trim() })}</p>
            </Card>
          ) : (
            visibleItems.map(({ seller, stats }) => (
              <Card key={seller.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-lg font-bold">{seller.name}</p>
                    <p className="text-sm text-slate-600">{seller.email}</p>
                    <p className="text-sm text-slate-600">{seller.phone ?? t("noPhoneProvided")}</p>
                    <p className={`text-xs font-semibold ${seller.blocked ? "text-red-600" : "text-emerald-600"}`}>{seller.blocked ? t("blocked") : t("active")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/sellers/${seller.id}`} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                      {t("openProfile")}
                    </Link>
                    {seller.blocked ? (
                      <Button variant="outline" onClick={() => void setBlocked(seller.id, "UNBLOCK")} disabled={busyId === seller.id}>
                        {t("unblock")}
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => void setBlocked(seller.id, "BLOCK")} disabled={busyId === seller.id}>
                        {t("block")}
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => void removeSeller(seller.id)} disabled={busyId === seller.id}>
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

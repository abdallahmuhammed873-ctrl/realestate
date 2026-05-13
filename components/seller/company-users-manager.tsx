"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isValidPhoneNumber } from "@/lib/utils";
import { useLanguage } from "@/components/layout/language-provider";

type CompanyUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  blocked?: boolean;
};

export function CompanyUsersManager({ initialItems }: { initialItems: CompanyUser[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refreshItems() {
    const res = await fetch("/api/seller/users");
    if (!res.ok) return;
    const data = await res.json();
    setItems(Array.isArray(data.items) ? data.items : []);
    router.refresh();
  }

  async function addUser() {
    setError("");
    if (!name.trim() || !email.trim() || !password) {
      setError(t("nameEmailPasswordRequired"));
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
      const res = await fetch("/api/seller/users", {
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
      const res = await fetch(`/api/seller/users/${id}`, {
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

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-bold">{t("addCompanyUser")}</h2>
        <p className="text-muted mt-1 text-sm">{t("createUsersUnderCompany")}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Input placeholder={t("userName")} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder={t("userEmail")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
          <Input
            type="tel"
            placeholder={t("userPhoneOptional")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            pattern="01[0-9]{9}"
            minLength={11}
            maxLength={11}
            title={t("phoneValidation")}
          />
        </div>
        <div className="mt-3">
          <Button onClick={addUser} disabled={saving}>
            {saving ? t("saving") : t("addUser")}
          </Button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </Card>

      {items.length === 0 ? (
        <Card>
          <p className="text-muted text-sm">{t("noCompanyUsersFound")}</p>
        </Card>
      ) : (
        items.map((user) => (
          <Card key={user.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-lg font-bold">{user.name}</p>
                <p className="text-muted text-sm">{user.email}</p>
                <p className="text-muted text-sm">{user.phone ?? t("noPhoneProvided")}</p>
                <p className={`text-xs font-semibold ${user.blocked ? "text-red-600" : "text-emerald-600"}`}>
                  {user.blocked ? t("deactivated") : t("active")}
                </p>
              </div>
              <div className="flex gap-2">
                {user.blocked ? (
                  <Button variant="outline" onClick={() => void setBlocked(user.id, "UNBLOCK")} disabled={busyId === user.id}>
                    {t("reactivate")}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => void setBlocked(user.id, "BLOCK")} disabled={busyId === user.id}>
                    {t("deactivate")}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

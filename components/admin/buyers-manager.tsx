"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isValidPhoneNumber } from "@/lib/utils";

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
  const visibleItems =
    normalizedSearchName.length === 0
      ? items
      : items.filter(({ buyer }) => buyer.name.toLowerCase().includes(normalizedSearchName));

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
      setError("Name and email are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (phone.trim() && !isValidPhoneNumber(phone)) {
      setError("Phone number must be 11 digits and start with 01.");
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
        setError(data.error ?? "Failed to add buyer.");
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
        setError(data.error ?? "Failed to update buyer.");
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
        setError(data.error ?? "Failed to remove buyer.");
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
        <h2 className="text-lg font-bold">Add Buyer</h2>
        <p className="mt-1 text-sm text-slate-600">Create a buyer account manually.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <Input placeholder="Buyer name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            type="email"
            placeholder="Buyer email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
          <Input
            type="tel"
            placeholder="Buyer phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="off"
            pattern="01[0-9]{9}"
            minLength={11}
            maxLength={11}
            title="Phone number must be 11 digits and start with 01"
          />
          <Input
            type="text"
            placeholder="Buyer password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            minLength={6}
          />
        </div>
        <div className="mt-3">
          <Button onClick={addBuyer} disabled={saving}>
            {saving ? "Saving..." : "Add Buyer"}
          </Button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </Card>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">No buyer profiles found.</p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">Search</h2>
                <p className="mt-1 text-sm text-slate-600">Search buyers by name.</p>
              </div>
              <div className="flex w-full gap-2 sm:w-[420px]">
                <Input
                  placeholder="Search buyer name..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
                <Button variant="outline" onClick={() => setSearchName("")} disabled={!searchName.trim()}>
                  Clear
                </Button>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Showing {visibleItems.length} of {items.length}
            </p>
          </Card>

          {visibleItems.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-600">No buyers match “{searchName.trim()}”.</p>
            </Card>
          ) : (
            visibleItems.map(({ buyer, stats }) => (
              <Card key={buyer.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-lg font-bold">{buyer.name}</p>
                    <p className="text-sm text-slate-600">{buyer.email}</p>
                    <p className="text-sm text-slate-600">{buyer.phone ?? "No phone provided"}</p>
                    <p className={`text-xs font-semibold ${buyer.blocked ? "text-red-600" : "text-emerald-600"}`}>
                      {buyer.blocked ? "Blocked" : "Active"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {buyer.blocked ? (
                      <Button
                        variant="outline"
                        onClick={() => setBlocked(buyer.id, "UNBLOCK")}
                        disabled={busyId === buyer.id}
                      >
                        Unblock
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => setBlocked(buyer.id, "BLOCK")} disabled={busyId === buyer.id}>
                        Block
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => removeBuyer(buyer.id)} disabled={busyId === buyer.id}>
                      Remove
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                  <p className="rounded-lg bg-slate-50 px-3 py-2">Favorites: {stats.favorites}</p>
                  <p className="rounded-lg bg-slate-50 px-3 py-2">Appointments: {stats.appointments}</p>
                  <p className="rounded-lg bg-slate-50 px-3 py-2">Saved searches: {stats.savedSearches}</p>
                </div>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
}

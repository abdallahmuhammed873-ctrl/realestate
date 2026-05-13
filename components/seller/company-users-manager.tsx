"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isValidPhoneNumber } from "@/lib/utils";

type CompanyUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  blocked?: boolean;
};

export function CompanyUsersManager({ initialItems }: { initialItems: CompanyUser[] }) {
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
      setError("Name, email, and password are required.");
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
      const res = await fetch("/api/seller/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to add user.");
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
        setError(data.error ?? "Failed to update user.");
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
        <h2 className="text-lg font-bold">Add Company User</h2>
        <p className="text-muted mt-1 text-sm">Create users under your company account.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Input placeholder="User name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="User email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
          />
          <Input
            type="tel"
            placeholder="User phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            pattern="01[0-9]{9}"
            minLength={11}
            maxLength={11}
            title="Phone number must be 11 digits and start with 01"
          />
        </div>
        <div className="mt-3">
          <Button onClick={addUser} disabled={saving}>
            {saving ? "Saving..." : "Add User"}
          </Button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </Card>

      {items.length === 0 ? (
        <Card>
          <p className="text-muted text-sm">No company users found.</p>
        </Card>
      ) : (
        items.map((user) => (
          <Card key={user.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-lg font-bold">{user.name}</p>
                <p className="text-muted text-sm">{user.email}</p>
                <p className="text-muted text-sm">{user.phone ?? "No phone provided"}</p>
                <p className={`text-xs font-semibold ${user.blocked ? "text-red-600" : "text-emerald-600"}`}>
                  {user.blocked ? "Deactivated" : "Active"}
                </p>
              </div>
              <div className="flex gap-2">
                {user.blocked ? (
                  <Button variant="outline" onClick={() => setBlocked(user.id, "UNBLOCK")} disabled={busyId === user.id}>
                    Reactivate
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setBlocked(user.id, "BLOCK")} disabled={busyId === user.id}>
                    Deactivate
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

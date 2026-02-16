"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function AuthPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState("BUYER");

  async function login() {
    const res = await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, role })
    });
    if (res.ok) router.push("/");
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-white p-6">
      <h1 className="text-2xl font-bold">Login / Register</h1>
      <p className="mt-1 text-sm text-slate-600">Email/phone OTP flow is stubbed for demo.</p>
      <div className="mt-4 space-y-3">
        <Input placeholder="Email or phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="BUYER">Buyer/Tenant</option>
          <option value="SELLER">Seller/Developer</option>
          <option value="ADMIN">Admin</option>
        </Select>
        <Button className="w-full" onClick={login}>
          Continue
        </Button>
      </div>
      <p className="mt-3 text-xs text-slate-500">Use buyer@example.com, seller@example.com, or admin@example.com.</p>
    </div>
  );
}

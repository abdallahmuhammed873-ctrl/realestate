"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    setError("");
    const res = await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim(), password: password.trim(), role: "ADMIN" })
    });

    if (!res.ok) {
      setError("Admin login failed. Use admin@example.com and password 123456.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await login();
  }

  async function onEnter(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    await login();
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-white p-6">
      <h1 className="text-2xl font-bold">Admin Login</h1>
      <p className="mt-1 text-sm text-slate-600">This login is restricted to admin accounts only.</p>
      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <Input
          placeholder="Admin email or phone"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onKeyDown={onEnter}
          required
        />
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={onEnter}
            minLength={6}
            className="pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {"👁"}
          </button>
        </div>
        <Button className="w-full" type="submit">
          Continue as Admin
        </Button>
      </form>
      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
      <p className="mt-3 text-xs text-slate-500">Use admin@example.com / 123456.</p>
    </div>
  );
}


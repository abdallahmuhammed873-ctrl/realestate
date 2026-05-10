"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";

export function LoginRequiredModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(String(data?.error ?? "Login failed."));
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Login Required</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            aria-label="Close login required popup"
          >
            X
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">Login with your email/phone or reset your password using OTP.</p>
        <form className="mt-4 space-y-3" onSubmit={login}>
          <Input placeholder="Email or phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Continue
          </button>
          <Link
            href="/auth/signup"
            onClick={onClose}
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Sign Up
          </Link>
          <Link
            href="/auth"
            onClick={onClose}
            className="block w-full text-center text-sm font-semibold text-brand-700 hover:underline"
          >
            Forget password?
          </Link>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}

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
    <div className="overlay-backdrop fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="surface-panel w-full max-w-sm rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Login Required</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border theme-divider px-2 py-1 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface-soft)]"
            aria-label="Close login required popup"
          >
            X
          </button>
        </div>
        <p className="text-muted mt-1 text-sm">Login with your email/phone or reset your password using OTP.</p>
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
            className="inline-flex w-full items-center justify-center rounded-xl border theme-divider bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-soft)]"
          >
            Sign Up
          </Link>
          <Link
            href="/auth/forgot-password"
            onClick={onClose}
            className="link-accent block w-full text-center text-sm font-semibold hover:underline"
          >
            Forget password?
          </Link>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}

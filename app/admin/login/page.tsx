"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/layout/language-provider";

export default function AdminLoginPage() {
  const { direction, t } = useLanguage();
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
      setError(t("adminLoginFailed"));
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
      <h1 className="text-2xl font-bold">{t("adminLogin")}</h1>
      <p className="mt-1 text-sm text-slate-600">{t("adminLoginRestricted")}</p>
      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <Input
          placeholder={t("adminEmailOrPhone")}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onKeyDown={onEnter}
          required
        />
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={onEnter}
            minLength={6}
            className={direction === "rtl" ? "pl-10" : "pr-10"}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className={`absolute top-1/2 -translate-y-1/2 text-sm text-slate-600 ${direction === "rtl" ? "left-2" : "right-2"}`}
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
          >
            {"ðŸ‘"}
          </button>
        </div>
        <Button className="w-full" type="submit">
          {t("continueAsAdmin")}
        </Button>
      </form>
      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
      <p className="mt-3 text-xs text-slate-500">{t("adminDemoCredentials")}</p>
    </div>
  );
}

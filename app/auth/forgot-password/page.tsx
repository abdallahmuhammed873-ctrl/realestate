"use client";

import Link from "next/link";
import { useState, type FormEvent, type SVGProps } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function EyeIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6A2.99 2.99 0 0 0 9 12c0 1.66 1.34 3 3 3 .48 0 .93-.11 1.33-.3" />
        <path d="M6.2 6.2C4 7.9 2.7 10.2 2 12c0 0 3.5 7 10 7 1.8 0 3.4-.4 4.8-1.1" />
        <path d="M9.9 4.3C10.6 4.1 11.3 4 12 4c6.5 0 10 8 10 8-.6 1.4-1.5 2.9-2.8 4.2" />
      </svg>
    );
  }

  async function sendOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(data.error ?? "Failed to send OTP."));
        return;
      }
      setMessage(String(data.message ?? "OTP sent successfully."));
      setStep(2);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(data.error ?? "Failed to verify OTP."));
        return;
      }
      setResetToken(String(data.resetToken ?? ""));
      setMessage("OTP verified. You can now set a new password.");
      setStep(3);
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Password and confirmation must match.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resetToken, newPassword, confirmPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(data.error ?? "Failed to reset password."));
        return;
      }
      router.push(String(data.redirectTo ?? "/auth"));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-white p-6">
      <h1 className="text-2xl font-bold">Forgot Password</h1>
      <p className="mt-1 text-sm text-slate-600">Reset your password using OTP sent to your email.</p>

      {step === 1 ? (
        <form className="mt-4 space-y-3" onSubmit={sendOtp}>
          <Input type="email" placeholder="Account email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? "Sending..." : "Send OTP"}
          </Button>
        </form>
      ) : null}

      {step === 2 ? (
        <form className="mt-4 space-y-3" onSubmit={verifyOtp}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input placeholder="Enter OTP code" value={otp} onChange={(e) => setOtp(e.target.value)} required />
          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? "Verifying..." : "Verify OTP"}
          </Button>
        </form>
      ) : null}

      {step === 3 ? (
        <form className="mt-4 space-y-3" onSubmit={reset}>
          <div className="relative">
            <Input
              type={showNewPassword ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
              className="pr-10"
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
              aria-pressed={showNewPassword}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowNewPassword((v) => !v)}
            >
              {showNewPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>

          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
              className="pr-10"
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              aria-pressed={showConfirmPassword}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowConfirmPassword((v) => !v)}
            >
              {showConfirmPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? "Updating..." : "Reset Password"}
          </Button>
        </form>
      ) : null}

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
      {message ? <p className="mt-3 text-xs text-emerald-700">{message}</p> : null}

      <p className="mt-4 text-center text-sm">
        <Link href="/auth" className="text-brand-700 hover:text-brand-800">
          Back to login
        </Link>
      </p>
    </div>
  );
}

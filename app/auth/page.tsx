"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function AuthPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [showSignUp, setShowSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accountType, setAccountType] = useState("SELLER");
  const [companyName, setCompanyName] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [signUpError, setSignUpError] = useState("");


  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password: loginPassword })
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const userRole = String(data?.user?.role ?? "");
      if (userRole === "ADMIN") {
        router.push("/admin");
      } else if (userRole === "SELLER") {
        router.push("/seller/dashboard");
      } else {
        router.push("/profile");
      }
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    setLoginError(String(data?.error ?? "Login failed."));
  }

  async function signUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSignUpError("");
    if (signUpPassword !== confirmPassword) {
      setSignUpError("Password and confirmation must match.");
      return;
    }

    const signUpRole = accountType === "BUYER" ? "BUYER" : "SELLER";
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phoneNumber,
        accountType,
        password: signUpPassword,
        confirmPassword,
        companyName: accountType === "DEVELOPER" ? companyName : undefined
      })
    });

    if (res.ok) {
      setShowSignUp(false);
      router.push(signUpRole === "SELLER" ? "/seller/dashboard" : "/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setSignUpError(String(data?.error ?? "Signup failed. Please try again."));
    }
  }

  return (
    <>
      <div className="mx-auto max-w-md rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-bold">Login / Register</h1>
        <p className="mt-1 text-sm text-slate-600">Login with your email/phone or reset your password using OTP.</p>
        <form className="mt-4 space-y-3" onSubmit={login}>
          <Input placeholder="Email or phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          <div className="relative">
            <Input
              type={showLoginPassword ? "text" : "password"}
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              minLength={6}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowLoginPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-600"
              aria-label={showLoginPassword ? "Hide password" : "Show password"}
            >
              {"👁"}
            </button>
          </div>
          <Button className="w-full" type="submit">
            Continue
          </Button>
          <Button className="w-full" type="button" variant="outline" onClick={() => setShowSignUp(true)}>
            Sign Up
          </Button>
          <Link href="/auth/forgot-password" className="block text-center text-sm font-medium text-brand-700 hover:text-brand-800">
            Forgot password?
          </Link>
          {loginError ? <p className="text-xs text-red-600">{loginError}</p> : null}
        </form>
        <p className="mt-3 text-xs text-slate-500">Use buyer@example.com or seller@example.com. Default demo password: 123456</p>
      </div>

      {showSignUp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Sign Up</h2>
              <button
                type="button"
                onClick={() => setShowSignUp(false)}
                className="rounded-md border px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                aria-label="Close sign up"
              >
                X
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-600">Create your account to continue.</p>
            <form className="mt-4 space-y-3" onSubmit={signUp}>
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input
                type="tel"
                placeholder="Phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                pattern="01[0-9]{9}"
                minLength={11}
                maxLength={11}
                title="Phone number must be 11 digits and start with 01"
                required
              />
              <div className="relative">
                <Input
                  type={showSignUpPassword ? "text" : "password"}
                  placeholder="Password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  minLength={6}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSignUpPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-600"
                  aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                >
                  {"👁"}
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showSignUpConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSignUpConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-600"
                  aria-label={showSignUpConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {"👁"}
                </button>
              </div>
              <Select value={accountType} onChange={(e) => setAccountType(e.target.value)} required>
                <option value="BUYER">Buyer</option>
                <option value="SELLER">Seller</option>
                <option value="DEVELOPER">Developer</option>
              </Select>
              {accountType === "DEVELOPER" ? (
                <Input
                  placeholder="Company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              ) : null}
              <Button className="w-full" type="submit">
                Create account
              </Button>
              {signUpError ? <p className="text-xs text-red-600">{signUpError}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}


"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accountType, setAccountType] = useState("SELLER");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signUpError, setSignUpError] = useState("");

  async function signUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSignUpError("");
    if (password !== confirmPassword) {
      setSignUpError("Password and confirmation must match.");
      return;
    }

    const demoRole = accountType === "BUYER" ? "BUYER" : "SELLER";
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phoneNumber,
        accountType,
        password,
        confirmPassword,
        companyName: accountType === "DEVELOPER" ? companyName : undefined
      })
    });

    if (res.ok) {
      router.push(demoRole === "SELLER" ? "/seller/dashboard" : "/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setSignUpError(String(data?.error ?? "Signup failed. Please try again."));
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-white p-6">
      <h1 className="text-2xl font-bold">Sign Up</h1>
      <p className="mt-1 text-sm text-slate-600">Create your account to continue.</p>
      <form className="mt-4 space-y-3" onSubmit={signUp}>
        <Input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
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
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        <div className="relative">
          <Input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            className="pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-600"
            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
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
        <Button className="w-full" type="button" variant="outline" onClick={() => router.push("/auth")}>
          Back to login
        </Button>
        {signUpError ? <p className="text-xs text-red-600">{signUpError}</p> : null}
      </form>
      <p className="mt-3 text-xs text-slate-500">All fields are required.</p>
    </div>
  );
}


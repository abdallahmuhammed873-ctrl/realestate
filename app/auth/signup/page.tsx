"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLanguage } from "@/components/layout/language-provider";

export default function SignUpPage() {
  const { direction, t } = useLanguage();
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

  const iconInsetClass = direction === "rtl" ? "left-2" : "right-2";
  const inputPaddingClass = direction === "rtl" ? "pl-10" : "pr-10";

  async function signUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSignUpError("");
    if (password !== confirmPassword) {
      setSignUpError(t("passwordConfirmationMismatch"));
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
      setSignUpError(String(data?.error ?? t("signupFailed")));
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-white p-6">
      <h1 className="text-2xl font-bold">{t("signUp")}</h1>
      <p className="mt-1 text-sm text-slate-600">{t("createAccountContinue")}</p>
      <form className="mt-4 space-y-3" onSubmit={signUp}>
        <Input placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} required />
        <Input type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          type="tel"
          placeholder={t("phoneNumber")}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          pattern="01[0-9]{9}"
          minLength={11}
          maxLength={11}
          title={t("phoneValidation")}
          required
        />
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            className={inputPaddingClass}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className={`absolute top-1/2 -translate-y-1/2 text-sm text-slate-600 ${iconInsetClass}`}
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
          >
            {"ðŸ‘"}
          </button>
        </div>
        <div className="relative">
          <Input
            type={showConfirmPassword ? "text" : "password"}
            placeholder={t("confirmPassword")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            className={inputPaddingClass}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className={`absolute top-1/2 -translate-y-1/2 text-sm text-slate-600 ${iconInsetClass}`}
            aria-label={showConfirmPassword ? t("hideConfirmPassword") : t("showConfirmPassword")}
          >
            {"ðŸ‘"}
          </button>
        </div>
        <Select value={accountType} onChange={(e) => setAccountType(e.target.value)} required>
          <option value="BUYER">{t("buyerOption")}</option>
          <option value="SELLER">{t("sellerOption")}</option>
          <option value="DEVELOPER">{t("developerOption")}</option>
        </Select>
        {accountType === "DEVELOPER" ? (
          <Input placeholder={t("companyName")} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        ) : null}
        <Button className="w-full" type="submit">
          {t("createAccount")}
        </Button>
        <Button className="w-full" type="button" variant="outline" onClick={() => router.push("/auth")}>
          {t("backToLogin")}
        </Button>
        {signUpError ? <p className="text-xs text-red-600">{signUpError}</p> : null}
      </form>
      <p className="mt-3 text-xs text-slate-500">{t("fillRequiredFields")}</p>
    </div>
  );
}

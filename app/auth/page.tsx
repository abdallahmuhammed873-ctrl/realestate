"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLanguage } from "@/components/layout/language-provider";

export default function AuthPage() {
  const { direction, t } = useLanguage();
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

  const iconInsetClass = direction === "rtl" ? "left-2" : "right-2";
  const inputPaddingClass = direction === "rtl" ? "pl-10" : "pr-10";

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
    setLoginError(String(data?.error ?? t("loginFailed")));
  }

  async function signUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSignUpError("");
    if (signUpPassword !== confirmPassword) {
      setSignUpError(t("passwordConfirmationMismatch"));
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
      setSignUpError(String(data?.error ?? t("signupFailed")));
    }
  }

  return (
    <>
      <div className="mx-auto max-w-md rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-bold">{t("loginRegister")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("loginOrResetHint")}</p>
        <form className="mt-4 space-y-3" onSubmit={login}>
          <Input placeholder={t("emailOrPhone")} value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          <div className="relative">
            <Input
              type={showLoginPassword ? "text" : "password"}
              placeholder={t("password")}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              minLength={6}
              className={inputPaddingClass}
              required
            />
            <button
              type="button"
              onClick={() => setShowLoginPassword((v) => !v)}
              className={`absolute top-1/2 -translate-y-1/2 text-sm text-slate-600 ${iconInsetClass}`}
              aria-label={showLoginPassword ? t("hidePassword") : t("showPassword")}
            >
              {"ðŸ‘"}
            </button>
          </div>
          <Button className="w-full" type="submit">
            {t("continueButton")}
          </Button>
          <Button className="w-full" type="button" variant="outline" onClick={() => setShowSignUp(true)}>
            {t("signUp")}
          </Button>
          <Link href="/auth/forgot-password" className="block text-center text-sm font-medium text-brand-700 hover:text-brand-800">
            {t("forgotPassword")}
          </Link>
          {loginError ? <p className="text-xs text-red-600">{loginError}</p> : null}
        </form>
        <p className="mt-3 text-xs text-slate-500">{t("demoCredentialsHint")}</p>
      </div>

      {showSignUp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("signUp")}</h2>
              <button
                type="button"
                onClick={() => setShowSignUp(false)}
                className="rounded-md border px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                aria-label={t("closeSignUp")}
              >
                X
              </button>
            </div>
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
                  type={showSignUpPassword ? "text" : "password"}
                  placeholder={t("password")}
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  minLength={6}
                  className={inputPaddingClass}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSignUpPassword((v) => !v)}
                  className={`absolute top-1/2 -translate-y-1/2 text-sm text-slate-600 ${iconInsetClass}`}
                  aria-label={showSignUpPassword ? t("hidePassword") : t("showPassword")}
                >
                  {"ðŸ‘"}
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showSignUpConfirmPassword ? "text" : "password"}
                  placeholder={t("confirmPassword")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className={inputPaddingClass}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSignUpConfirmPassword((v) => !v)}
                  className={`absolute top-1/2 -translate-y-1/2 text-sm text-slate-600 ${iconInsetClass}`}
                  aria-label={showSignUpConfirmPassword ? t("hideConfirmPassword") : t("showConfirmPassword")}
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
                <Input
                  placeholder={t("companyName")}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              ) : null}
              <Button className="w-full" type="submit">
                {t("createAccount")}
              </Button>
              {signUpError ? <p className="text-xs text-red-600">{signUpError}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/layout/language-provider";

type ListingDraft = {
  listingId?: string;
  property?: Record<string, unknown>;
};

const DRAFT_KEY = "seller_listing_draft";
const CARD_KEY = "seller_listing_saved_card";

type SavedCard = {
  cardholder: string;
  cardNumber: string;
  expiry: string;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function ListingPaymentClient() {
  const { t } = useLanguage();
  const router = useRouter();
  const [draft, setDraft] = useState<ListingDraft | null>(null);
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const rawDraft = sessionStorage.getItem(DRAFT_KEY);
    if (!rawDraft) {
      setDraft(null);
      return;
    }
    const parsed = JSON.parse(rawDraft) as ListingDraft;
    setDraft(parsed);

    const rawCard = localStorage.getItem(CARD_KEY);
    if (!rawCard) return;
    try {
      const saved = JSON.parse(rawCard) as SavedCard;
      setCardholder(saved.cardholder ?? "");
      setCardNumber(saved.cardNumber ?? "");
      setExpiry(saved.expiry ?? "");
      setInfo(saved.cardNumber ? t("usingSavedCard", { digits: saved.cardNumber.slice(-4) }) : "");
    } catch {
      localStorage.removeItem(CARD_KEY);
    }
  }, [t]);

  function normalizeCardNumber(input: string) {
    return digitsOnly(input).slice(0, 16);
  }

  function normalizeExpiry(input: string) {
    const cleaned = digitsOnly(input).slice(0, 4);
    if (cleaned.length <= 2) return cleaned;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  }

  function validatePayment() {
    const trimmedName = cardholder.trim();
    const normalizedNumber = normalizeCardNumber(cardNumber);
    const normalizedExpiry = normalizeExpiry(expiry);
    const normalizedCvv = digitsOnly(cvv).slice(0, 3);

    if (!trimmedName || !normalizedNumber || !normalizedExpiry || !normalizedCvv) {
      return t("allPaymentFieldsRequired");
    }
    if (normalizedNumber.length !== 16) {
      return t("cardNumberExact");
    }
    if (!/^\d{2}\/\d{2}$/.test(normalizedExpiry)) {
      return t("expiryFormat");
    }
    const month = Number(normalizedExpiry.slice(0, 2));
    if (month < 1 || month > 12) {
      return t("expiryMonthRange");
    }
    if (normalizedCvv.length !== 3) {
      return t("cvvExact");
    }
    return null;
  }

  async function payAndSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!draft?.property) {
      setError(t("noListingDraftFound"));
      return;
    }

    const validationError = validatePayment();
    if (validationError) {
      setError(validationError);
      return;
    }

    const normalizedNumber = normalizeCardNumber(cardNumber);
    const normalizedExpiry = normalizeExpiry(expiry);
    const normalizedCvv = digitsOnly(cvv).slice(0, 3);
    const normalizedName = cardholder.trim();
    setCardNumber(normalizedNumber);
    setExpiry(normalizedExpiry);
    setCvv(normalizedCvv);

    setPaying(true);
    try {
      localStorage.setItem(
        CARD_KEY,
        JSON.stringify({
          cardholder: normalizedName,
          cardNumber: normalizedNumber,
          expiry: normalizedExpiry
        } satisfies SavedCard)
      );

      const res = await fetch("/api/seller/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, feesPaid: true })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(String(data?.error ?? t("paymentAcceptedListingFailed")));
        return;
      }

      sessionStorage.removeItem(DRAFT_KEY);
      setInfo(t("paymentSuccessfulListingSubmitted"));
      router.push("/seller/new/thank-you");
      router.refresh();
    } finally {
      setPaying(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("payToPublishListing")}</h2>
        <p className="text-sm text-slate-600">{t("paymentAfterSuccess")}</p>
        <p className="mt-1 text-sm font-medium text-slate-700">{t("listingFeeNotice")}</p>
      </div>

      {!draft?.property ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{t("noListingDraftForPayment")}</p>
      ) : null}

      <form className="space-y-3" onSubmit={payAndSubmit}>
        <Input placeholder={t("cardholderName")} value={cardholder} onChange={(e) => setCardholder(e.target.value)} required />
        <Input
          placeholder={t("cardNumberLabel")}
          inputMode="numeric"
          pattern="\d{16}"
          maxLength={16}
          value={cardNumber}
          onChange={(e) => setCardNumber(normalizeCardNumber(e.target.value))}
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder={t("expiryLabel")}
            inputMode="numeric"
            pattern="\d{2}/\d{2}"
            maxLength={5}
            value={expiry}
            onChange={(e) => setExpiry(normalizeExpiry(e.target.value))}
            required
          />
          <Input
            placeholder={t("cvvLabel")}
            inputMode="numeric"
            pattern="\d{3}"
            maxLength={3}
            value={cvv}
            onChange={(e) => setCvv(digitsOnly(e.target.value).slice(0, 3))}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="submit" disabled={paying || !draft?.property} className="w-full">
            {paying ? t("processingPayment") : t("payAndSubmitForApproval")}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/")}>
            {t("cancel")}
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-emerald-700">{info}</p> : null}
    </Card>
  );
}

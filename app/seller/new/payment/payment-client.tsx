"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
      setInfo(saved.cardNumber ? `Using saved card ending ${saved.cardNumber.slice(-4)}.` : "");
    } catch {
      localStorage.removeItem(CARD_KEY);
    }
  }, []);

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
      return "All payment fields are required.";
    }
    if (normalizedNumber.length !== 16) {
      return "Card number must be exactly 16 digits.";
    }
    if (!/^\d{2}\/\d{2}$/.test(normalizedExpiry)) {
      return "Expiry must be in MM/YY format.";
    }
    const month = Number(normalizedExpiry.slice(0, 2));
    if (month < 1 || month > 12) {
      return "Expiry month must be between 01 and 12.";
    }
    if (normalizedCvv.length !== 3) {
      return "CVV must be exactly 3 digits.";
    }
    return null;
  }

  async function payAndSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!draft?.property) {
      setError("No listing draft found. Please return to listing details and click Next again.");
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
      // Demo save-card behavior for future listing payments.
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
        setError(String(data?.error ?? "Payment accepted, but listing submission failed."));
        return;
      }

      sessionStorage.removeItem(DRAFT_KEY);
      setInfo("Payment successful. Listing submitted for admin approval.");
      router.push("/seller/new/thank-you");
      router.refresh();
    } finally {
      setPaying(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Pay to Publish Listing</h2>
        <p className="text-sm text-slate-600">Your listing will be submitted for admin approval after successful payment.</p>
        <p className="mt-1 text-sm font-medium text-slate-700">In order to submit your listing, you have to pay listing fees of 500 EGP.</p>
      </div>

      {!draft?.property ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          No listing details found for payment. Please go back and click Next again.
        </p>
      ) : null}

      <form className="space-y-3" onSubmit={payAndSubmit}>
        <Input
          placeholder="Cardholder Name"
          value={cardholder}
          onChange={(e) => setCardholder(e.target.value)}
          required
        />
        <Input
          placeholder="Card Number (16 digits)"
          inputMode="numeric"
          pattern="\d{16}"
          maxLength={16}
          value={cardNumber}
          onChange={(e) => setCardNumber(normalizeCardNumber(e.target.value))}
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="MM/YY"
            inputMode="numeric"
            pattern="\d{2}/\d{2}"
            maxLength={5}
            value={expiry}
            onChange={(e) => setExpiry(normalizeExpiry(e.target.value))}
            required
          />
          <Input
            placeholder="CVV (3 digits)"
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
            {paying ? "Processing Payment..." : "Pay & Submit for Approval"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/")}>
            Cancel
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-emerald-700">{info}</p> : null}
    </Card>
  );
}

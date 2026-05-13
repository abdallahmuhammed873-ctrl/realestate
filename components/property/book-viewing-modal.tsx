"use client";

import { useState } from "react";
import { useLanguage } from "@/components/layout/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoginRequiredModal } from "@/components/auth/login-required-modal";
import { isValidPhoneNumber } from "@/lib/utils";

export function BookViewingModal({ propertyId }: { propertyId: string }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ datetime: "", contactName: "", contactPhone: "", notes: "" });

  async function openModal() {
    const res = await fetch("/api/me");
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.user) {
        setOpen(true);
        return;
      }
    }
    setShowLoginRequired(true);
  }

  async function submit() {
    setError("");
    if (!isValidPhoneNumber(form.contactPhone)) {
      setError(t("phoneValidation"));
      return;
    }
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, ...form })
    });
    if (res.status === 401) {
      setOpen(false);
      setShowLoginRequired(true);
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(String(data?.error ?? t("submitFailed")));
      return;
    }
    if (res.ok) {
      setSubmitted(true);
      window.dispatchEvent(new Event("appointments:changed"));
      window.dispatchEvent(new Event("notifications:changed"));
    }
  }

  if (!open) {
    return (
      <>
        <Button onClick={openModal}>{t("bookViewing")}</Button>
        <LoginRequiredModal open={showLoginRequired} onClose={() => setShowLoginRequired(false)} />
      </>
    );
  }

  return (
    <>
      <div className="overlay-backdrop fixed inset-0 z-50 grid place-items-center p-4">
        <div className="surface-panel w-full max-w-md rounded-2xl p-4">
          {submitted ? (
            <div className="space-y-3 text-center">
              <h3 className="text-lg font-bold">{t("appointmentRequested")}</h3>
              <p className="text-muted text-sm">{t("appointmentRequestedDesc")}</p>
              <Button onClick={() => setOpen(false)}>{t("closeButton")}</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-lg font-bold">{t("bookViewingTitle")}</h3>
              <Input type="datetime-local" value={form.datetime} onChange={(e) => setForm((f) => ({ ...f, datetime: e.target.value }))} />
              <Input placeholder={t("contactName")} value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
              <Input
                type="tel"
                placeholder={t("contactPhone")}
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                pattern="01[0-9]{9}"
                minLength={11}
                maxLength={11}
                title={t("phoneValidation")}
                required
              />
              <Textarea placeholder={t("notesOptional")} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              <div className="flex gap-2">
                <Button onClick={submit}>{t("confirm")}</Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {t("cancel")}
                </Button>
              </div>
              {error ? <p className="text-xs text-red-600">{error}</p> : null}
            </div>
          )}
        </div>
      </div>
      <LoginRequiredModal open={showLoginRequired} onClose={() => setShowLoginRequired(false)} />
    </>
  );
}

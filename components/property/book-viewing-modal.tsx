"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoginRequiredModal } from "@/components/auth/login-required-modal";
import { isValidPhoneNumber } from "@/lib/utils";

export function BookViewingModal({ propertyId }: { propertyId: string }) {
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
      setError("Phone number must be 11 digits and start with 01.");
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
      setError(String(data?.error ?? "Failed to submit request."));
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
        <Button onClick={openModal}>Book Viewing</Button>
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
              <h3 className="text-lg font-bold">Appointment Requested</h3>
              <p className="text-muted text-sm">We sent your request to the seller. You will receive a notification update soon.</p>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-lg font-bold">Book a Viewing</h3>
              <Input type="datetime-local" value={form.datetime} onChange={(e) => setForm((f) => ({ ...f, datetime: e.target.value }))} />
              <Input placeholder="Contact name" value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
              <Input
                type="tel"
                placeholder="Contact phone"
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                pattern="01[0-9]{9}"
                minLength={11}
                maxLength={11}
                title="Phone number must be 11 digits and start with 01"
                required
              />
              <Textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              <div className="flex gap-2">
                <Button onClick={submit}>Confirm</Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
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

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function BookViewingModal({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ datetime: "", contactName: "", contactPhone: "", notes: "" });

  async function submit() {
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, ...form })
    });
    if (res.ok) setSubmitted(true);
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Book Viewing</Button>;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-4">
        {submitted ? (
          <div className="space-y-3 text-center">
            <h3 className="text-lg font-bold">Appointment Requested</h3>
            <p className="text-sm text-slate-600">We sent your request to the seller. You will receive a notification update soon.</p>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-lg font-bold">Book a Viewing</h3>
            <Input type="datetime-local" value={form.datetime} onChange={(e) => setForm((f) => ({ ...f, datetime: e.target.value }))} />
            <Input placeholder="Contact name" value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
            <Input placeholder="Contact phone" value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} />
            <Textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-2">
              <Button onClick={submit}>Confirm</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

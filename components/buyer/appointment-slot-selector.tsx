"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  appointmentId: string;
  slots: string[];
};

export function AppointmentSlotSelector({ appointmentId, slots }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState(slots[0] ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/buyer/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datetime: selected })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(String(body.error ?? "Failed to select slot"));
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to select slot");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-brand-200 bg-brand-50/40 p-3">
      <p className="text-xs font-semibold text-brand-700">Seller suggested new slots. Choose one:</p>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => setSelected(slot)}
            className={`rounded-lg border px-2 py-1 text-xs ${selected === slot ? "border-brand-700 bg-white text-brand-700" : "border-slate-200 bg-white text-slate-600"}`}
          >
            {new Date(slot).toLocaleString()}
          </button>
        ))}
      </div>
      <Button onClick={submit} disabled={saving || !selected}>
        Confirm Selected Slot
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

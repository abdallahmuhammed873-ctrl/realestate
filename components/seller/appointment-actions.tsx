"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/layout/language-provider";

type Props = {
  appointmentId: string;
  currentDatetime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "RESCHEDULED";
};

export function AppointmentActions({ appointmentId, currentDatetime, status }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [slots, setSlots] = useState<string[]>([currentDatetime.slice(0, 16), "", ""]);
  const [error, setError] = useState("");

  async function submit(action: "APPROVE" | "DENY" | "RESCHEDULE") {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/seller/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "RESCHEDULE"
            ? {
                action,
                slots: slots.map((slot) => slot.trim()).filter(Boolean)
              }
            : { action }
        )
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(String(body.error ?? t("failedToUpdateAppointment")));
      }
      setEditOpen(false);
      setRescheduleOpen(false);
      window.dispatchEvent(new Event("appointments:changed"));
      window.dispatchEvent(new Event("notifications:changed"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("failedToUpdateAppointment"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {status === "PENDING" ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void submit("APPROVE")} disabled={saving}>
            {t("approve")}
          </Button>
          <Button variant="outline" onClick={() => void submit("DENY")} disabled={saving}>
            {t("cancelRequest")}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditOpen(false);
              setRescheduleOpen((x) => !x);
            }}
            disabled={saving}
          >
            {t("reschedule")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditOpen((x) => !x)} disabled={saving}>
            {editOpen ? t("closeEdit") : t("edit")}
          </Button>
        </div>
      )}

      {editOpen && status !== "PENDING" && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void submit("APPROVE")} disabled={saving}>
            {t("approve")}
          </Button>
          <Button variant="outline" onClick={() => void submit("DENY")} disabled={saving}>
            {t("cancelRequest")}
          </Button>
          <Button variant="outline" onClick={() => setRescheduleOpen((x) => !x)} disabled={saving}>
            {t("reschedule")}
          </Button>
        </div>
      )}
      {rescheduleOpen && (
        <div className="space-y-2 rounded-xl border p-3">
          <p className="text-xs text-slate-600">{t("suggestSlotsHint")}</p>
          <div className="grid gap-2 md:grid-cols-3">
            {slots.map((slot, idx) => (
              <Input
                key={idx}
                type="datetime-local"
                value={slot}
                onChange={(e) =>
                  setSlots((prev) => {
                    const next = [...prev];
                    next[idx] = e.target.value;
                    return next;
                  })
                }
              />
            ))}
          </div>
          <Button onClick={() => void submit("RESCHEDULE")} disabled={saving || slots.every((slot) => !slot.trim())}>
            {t("sendSuggestedSlots")}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

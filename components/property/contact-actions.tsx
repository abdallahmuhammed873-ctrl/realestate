"use client";

import { useState, type MouseEvent } from "react";
import { LoginRequiredModal } from "@/components/auth/login-required-modal";

function normalizePhoneDigits(phone?: string) {
  return String(phone ?? "").replace(/[^\d+]/g, "").trim();
}

function toWhatsAppNumber(phone?: string) {
  const raw = normalizePhoneDigits(phone);
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `2${digits}`;
  return digits;
}

export function ContactActions({ phone }: { phone?: string }) {
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  const digits = normalizePhoneDigits(phone);
  const whatsappNumber = toWhatsAppNumber(phone);
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "#";
  const callHref = digits ? `tel:${digits}` : "#";
  const disabled = !digits;

  async function isLoggedIn() {
    const res = await fetch("/api/me");
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data?.user);
  }

  async function onWhatsAppClick(e: MouseEvent<HTMLAnchorElement>) {
    if (disabled) return;
    e.preventDefault();
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      setShowLoginRequired(true);
      return;
    }
    window.open(whatsappHref, "_blank", "noopener,noreferrer");
  }

  async function onCallClick(e: MouseEvent<HTMLAnchorElement>) {
    if (disabled) return;
    e.preventDefault();
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      setShowLoginRequired(true);
      return;
    }
    window.location.href = callHref;
  }

  return (
    <>
      <div className="pt-2 text-sm">
        <a
          href={whatsappHref}
          onClick={onWhatsAppClick}
          className={`mr-3 ${disabled ? "pointer-events-none text-slate-400" : "text-brand-700"}`}
        >
          WhatsApp
        </a>
        <a href={callHref} onClick={onCallClick} className={disabled ? "pointer-events-none text-slate-400" : "text-brand-700"}>
          Call
        </a>
      </div>
      <LoginRequiredModal open={showLoginRequired} onClose={() => setShowLoginRequired(false)} />
    </>
  );
}

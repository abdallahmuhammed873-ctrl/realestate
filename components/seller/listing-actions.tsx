"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/layout/language-provider";

export function ListingActions({ listingId, soldAt }: { listingId: string; soldAt?: string | null }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [markingSold, setMarkingSold] = useState(false);

  async function onSold() {
    if (!confirm(t("soldListingConfirm"))) return;
    setMarkingSold(true);
    try {
      const res = await fetch(`/api/seller/listings/${listingId}/sold`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(String(data?.error ?? t("failedToMarkSold")));
        return;
      }
      alert(t("propertyMarkedSold"));
      router.refresh();
    } finally {
      setMarkingSold(false);
    }
  }

  async function onDelete() {
    if (!confirm(t("deleteListingConfirm"))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/seller/listings/${listingId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(String(data?.error ?? t("failedToDeleteListing")));
        return;
      }
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-1">
      <Link href={`/seller/listings/${listingId}/edit`} className="text-sm font-semibold text-brand-700">
        {t("editListing")}
      </Link>
      {!soldAt ? (
        <button
          type="button"
          onClick={onSold}
          disabled={markingSold || deleting}
          className="text-sm font-semibold text-emerald-600 disabled:opacity-60"
        >
          {markingSold ? t("markingSold") : t("soldListing")}
        </button>
      ) : (
        <span className="text-sm font-semibold text-emerald-600">{t("soldListing")}</span>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting || markingSold}
        className="text-sm font-semibold text-red-600 disabled:opacity-60"
      >
        {deleting ? t("deleting") : t("deleteListing")}
      </button>
    </div>
  );
}

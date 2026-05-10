"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ListingActions({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this listing? This will remove it from the platform.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/seller/listings/${listingId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(String(data?.error ?? "Failed to delete listing."));
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
        Edit Listing
      </Link>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="text-sm font-semibold text-red-600 disabled:opacity-60"
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}


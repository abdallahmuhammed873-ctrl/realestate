"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type NotificationItem = {
  id: string;
  text: string;
  createdAt: string;
  href?: string;
  read: boolean;
};

export function NotificationsList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<NotificationItem[]>(items);

  async function markReviewed(id: string) {
    setLoadingId(id);
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setLocalItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
        window.dispatchEvent(new Event("notifications:changed"));
      }
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <ul className="space-y-2">
      {localItems.map((item) => (
        <li key={item.id} className={`rounded-xl border p-3 ${item.read ? "bg-white" : "bg-brand-50/40"}`}>
          <p className={`text-sm text-slate-800 ${item.read ? "font-normal" : "font-bold"}`}>{item.text}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
            <div className="flex items-center gap-2">
              {item.read ? (
                <Link href={item.href ?? "/notifications"} className="rounded-lg border px-3 py-1 text-xs font-semibold text-brand-700">
                  Show
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await markReviewed(item.id);
                    router.push(item.href ?? "/notifications");
                  }}
                  disabled={loadingId === item.id}
                  className="rounded-lg border px-3 py-1 text-xs font-semibold text-brand-700 disabled:opacity-60"
                >
                  Show
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

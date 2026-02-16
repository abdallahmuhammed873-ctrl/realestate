"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SORT_OPTIONS } from "@/lib/constants";

export function ResultsToolbar({ total }: { total: number }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const sort = params.get("sort") ?? "FEATURED";

  async function createAlert() {
    await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: Object.fromEntries(params.entries()) })
    });
    alert("Saved search alert created.");
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-white p-3">
      <p className="text-sm text-slate-600">{total} listings found</p>
      <div className="flex items-center gap-2">
        <Select
          value={sort}
          onChange={(e) => {
            const next = new URLSearchParams(params.toString());
            next.set("sort", e.target.value);
            router.push(`${pathname}?${next.toString()}`);
          }}
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Button variant="outline" onClick={createAlert}>
          Create Alert
        </Button>
      </div>
    </div>
  );
}

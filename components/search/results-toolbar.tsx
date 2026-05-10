"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { SORT_OPTIONS } from "@/lib/constants";

export function ResultsToolbar({ total }: { total: number }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const sort = params.get("sort") ?? "FEATURED";

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
      </div>
    </div>
  );
}

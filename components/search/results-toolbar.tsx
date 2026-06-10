"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/layout/language-provider";
import { Select } from "@/components/ui/select";
import { SORT_OPTIONS } from "@/lib/constants";
import { translateSortOption } from "@/lib/i18n";

export function ResultsToolbar({ total }: { total: number }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { language, t } = useLanguage();

  const sort = params.get("sort") ?? "FEATURED";

  return (
    <div className="surface-card mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl p-3">
      <p className="text-muted text-sm">
        {total} {t("listingsFound")}
      </p>
      <div className="flex items-center gap-2">
        <Select
          value={sort}
          onChange={(e) => {
            const next = new URLSearchParams(params.toString());
            next.set("sort", e.target.value);
            next.set("page", "1");
            router.push(`${pathname}?${next.toString()}`);
          }}
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {translateSortOption(s.value, language)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

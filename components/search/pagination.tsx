"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/layout/language-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getVisiblePages(page: number, pages: number) {
  const visible = new Set<number>([1, pages]);
  for (let candidate = page - 1; candidate <= page + 1; candidate += 1) {
    if (candidate >= 1 && candidate <= pages) visible.add(candidate);
  }
  if (page <= 3) {
    visible.add(2);
    visible.add(3);
  }
  if (page >= pages - 2) {
    visible.add(pages - 1);
    visible.add(pages - 2);
  }

  return Array.from(visible)
    .filter((candidate) => candidate >= 1 && candidate <= pages)
    .sort((a, b) => a - b)
    .reduce<Array<number | "ellipsis">>((items, candidate) => {
      const previous = items[items.length - 1];
      if (typeof previous === "number" && candidate - previous > 1) items.push("ellipsis");
      items.push(candidate);
      return items;
    }, []);
}

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const pathname = usePathname();
  const params = useSearchParams();
  const { t } = useLanguage();

  function hrefFor(nextPage: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(nextPage));
    return `${pathname}?${next.toString()}`;
  }

  const linkClassName =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold shadow-sm transition";
  const pageItems = getVisiblePages(page, pages);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      {page <= 1 ? (
        <Button variant="outline" disabled>
          {t("prev")}
        </Button>
      ) : (
        <Link
          className={cn(
            linkClassName,
            "theme-divider bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-soft)]"
          )}
          href={hrefFor(page - 1)}
        >
          {t("prev")}
        </Link>
      )}

      <div className="flex flex-wrap items-center justify-center gap-1">
        {pageItems.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="text-muted flex h-10 min-w-8 items-center justify-center text-sm">
              ...
            </span>
          ) : item === page ? (
            <span
              key={item}
              aria-current="page"
              className={cn(linkClassName, "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-contrast)]")}
            >
              {item}
            </span>
          ) : (
            <Link
              key={item}
              className={cn(
                linkClassName,
                "theme-divider bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-soft)]"
              )}
              href={hrefFor(item)}
            >
              {item}
            </Link>
          )
        )}
      </div>

      <span className="text-muted min-w-20 text-center text-sm">
        {t("pageXofY", { page, pages })}
      </span>

      {page >= pages ? (
        <Button variant="outline" disabled>
          {t("next")}
        </Button>
      ) : (
        <Link
          className={cn(
            linkClassName,
            "theme-divider bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-soft)]"
          )}
          href={hrefFor(page + 1)}
        >
          {t("next")}
        </Link>
      )}
    </div>
  );
}

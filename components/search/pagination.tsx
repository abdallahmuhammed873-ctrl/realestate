"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setPage(nextPage: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(nextPage));
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
        Prev
      </Button>
      <span className="text-sm text-slate-600">
        Page {page} / {pages}
      </span>
      <Button variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
        Next
      </Button>
    </div>
  );
}

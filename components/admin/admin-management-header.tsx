import Link from "next/link";
import type { Language } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function AdminManagementHeader({ language, title }: { language: Language; title: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Link
        href="/admin/analytics"
        className="rounded-xl border theme-divider bg-[var(--surface)] px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-soft)]"
      >
        {t(language, "backToAdmin")}
      </Link>
    </div>
  );
}

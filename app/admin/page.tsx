import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PendingListings } from "@/components/admin/pending-listings";
import { requireRole } from "@/lib/auth";
import { listPendingListings, listPendingListingsDetailed } from "@/lib/repository";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AdminOverviewPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/admin/login");
  const pending = await listPendingListings();
  const pendingDetailed = await listPendingListingsDetailed();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(language, "adminOverview")}</h1>
      <Card>
        <p className="text-soft text-sm">{t(language, "pendingApprovals")}</p>
        <p className="text-3xl font-bold">{pending.length}</p>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/pending" className="inline-block rounded-xl bg-brand-700 px-4 py-2 text-white">
          {t(language, "openPendingQueue")}
        </Link>
        <Link href="/admin/sellers" className="inline-block rounded-xl border theme-divider bg-[var(--surface)] px-4 py-2 text-[var(--ink)] hover:bg-[var(--surface-soft)]">
          {t(language, "viewSellerProfiles")}
        </Link>
        <Link href="/admin/developers" className="inline-block rounded-xl border theme-divider bg-[var(--surface)] px-4 py-2 text-[var(--ink)] hover:bg-[var(--surface-soft)]">
          {t(language, "viewDeveloperProfiles")}
        </Link>
        <Link href="/admin/buyers" className="inline-block rounded-xl border theme-divider bg-[var(--surface)] px-4 py-2 text-[var(--ink)] hover:bg-[var(--surface-soft)]">
          {t(language, "viewBuyerProfiles")}
        </Link>
        <Link href="/admin/approved" className="inline-block rounded-xl border theme-divider bg-[var(--surface)] px-4 py-2 text-[var(--ink)] hover:bg-[var(--surface-soft)]">
          {t(language, "openApprovedQueue")}
        </Link>
        <Link href="/admin/rejected" className="inline-block rounded-xl border theme-divider bg-[var(--surface)] px-4 py-2 text-[var(--ink)] hover:bg-[var(--surface-soft)]">
          {t(language, "openRejectedQueue")}
        </Link>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t(language, "allPendingListings")}</h2>
        <PendingListings items={pendingDetailed} />
      </section>
    </div>
  );
}

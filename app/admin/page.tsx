import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PendingListings } from "@/components/admin/pending-listings";
import { requireRole } from "@/lib/auth";
import { listPendingListings, listPendingListingsDetailed } from "@/lib/repository";

export default async function AdminOverviewPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/admin/login");
  const pending = listPendingListings();
  const pendingDetailed = listPendingListingsDetailed();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <Card>
        <p className="text-sm text-slate-500">Pending approvals</p>
        <p className="text-3xl font-bold">{pending.length}</p>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/pending" className="inline-block rounded-xl bg-brand-700 px-4 py-2 text-white">
          Open Pending Queue
        </Link>
        <Link href="/admin/sellers" className="inline-block rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-800">
          View Seller Profiles
        </Link>
        <Link href="/admin/developers" className="inline-block rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-800">
          View Developer Profiles
        </Link>
        <Link href="/admin/buyers" className="inline-block rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-800">
          View Buyer Profiles
        </Link>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">All Pending Listings</h2>
        <PendingListings items={pendingDetailed} />
      </section>
    </div>
  );
}

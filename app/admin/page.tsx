import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { listPendingListings } from "@/lib/repository";

export default async function AdminOverviewPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) return <p className="rounded-2xl border bg-white p-6">Admin access required. Login as admin.</p>;
  const pending = listPendingListings();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <Card>
        <p className="text-sm text-slate-500">Pending approvals</p>
        <p className="text-3xl font-bold">{pending.length}</p>
      </Card>
      <Link href="/admin/pending" className="inline-block rounded-xl bg-brand-700 px-4 py-2 text-white">
        Open Pending Queue
      </Link>
    </div>
  );
}

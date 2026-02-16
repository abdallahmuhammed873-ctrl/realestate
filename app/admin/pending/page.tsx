import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { listPendingListings } from "@/lib/repository";

export default async function AdminPendingPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) return <p className="rounded-2xl border bg-white p-6">Admin access required. Login as admin.</p>;
  const pending = listPendingListings();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pending Approvals</h1>
      {pending.length === 0 ? (
        <p className="rounded-2xl border bg-white p-6">No pending listings.</p>
      ) : (
        <div className="space-y-2">
          {pending.map((l) => (
            <Card key={l.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{l.id}</p>
                <p className="text-sm text-slate-500">Submitted by {l.userId}</p>
              </div>
              <Link href={`/admin/listings/${l.id}`} className="text-sm font-semibold text-brand-700">
                Review
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

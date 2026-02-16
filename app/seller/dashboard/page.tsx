import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { listSellerDashboard } from "@/lib/repository";

export default async function SellerDashboardPage() {
  const user = await requireRole(["SELLER"]);
  if (!user) return <p className="rounded-2xl border bg-white p-6">Seller access required. Login as seller.</p>;
  const data = listSellerDashboard(user.id);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Seller Dashboard</h1>
        <Link href="/seller/new" className="rounded-xl bg-brand-700 px-3 py-2 text-sm font-semibold text-white">
          New Listing
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {Object.entries(data.byStatus).map(([k, v]) => (
          <Card key={k}>
            <p className="text-xs text-slate-500">{k}</p>
            <p className="text-2xl font-bold">{v}</p>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="mb-3 text-lg font-bold">Your Listings</h2>
        <ul className="space-y-2">
          {data.detailed.map(({ listing, property }) => {
            return (
              <li key={listing.id} className="flex items-center justify-between rounded-xl border p-2">
                <span>
                  {property?.title ?? listing.id} · {listing.status}
                </span>
                {property && (
                  <Link href={`/seller/listings/${listing.id}/edit`} className="text-sm font-semibold text-brand-700">
                    Edit
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

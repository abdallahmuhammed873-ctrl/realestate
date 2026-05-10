import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { ListingPaymentClient } from "./payment-client";

export default async function SellerListingPaymentPage() {
  const user = await requireRole(["SELLER"]);
  if (!user) return <p className="rounded-2xl border bg-white p-6">Seller or developer access required. Login first.</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Listing Payment</h1>
        <Link href="/seller/new" className="text-sm font-semibold text-brand-700 hover:underline">
          Back to Listing Details
        </Link>
      </div>
      <ListingPaymentClient />
    </div>
  );
}

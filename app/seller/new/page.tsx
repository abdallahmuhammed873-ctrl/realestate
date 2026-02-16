import { ListingWizard } from "@/components/seller/listing-wizard";
import { requireRole } from "@/lib/auth";

export default async function SellerNewListingPage() {
  const user = await requireRole(["SELLER"]);
  if (!user) return <p className="rounded-2xl border bg-white p-6">Seller access required. Login as seller.</p>;
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Create Listing</h1>
      <ListingWizard />
    </div>
  );
}

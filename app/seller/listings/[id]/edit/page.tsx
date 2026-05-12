import { notFound } from "next/navigation";
import { ListingWizard } from "@/components/seller/listing-wizard";
import { requireRole } from "@/lib/auth";
import { getSellerListingById } from "@/lib/repository";

export default async function SellerEditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const user = await requireRole(["SELLER"]);
  if (!user) return <p className="rounded-2xl border bg-white p-6">Seller access required. Login as seller.</p>;
  const data = await getSellerListingById(resolved.id, user.id);
  if (!data) return notFound();
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Edit Listing</h1>
      <ListingWizard
        listingId={data.listing.id}
        initial={{
          ...data.property,
          amenities: data.property.amenities.join(",")
        }}
      />
    </div>
  );
}

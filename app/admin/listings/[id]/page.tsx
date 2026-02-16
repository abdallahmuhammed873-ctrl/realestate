import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getListingWithProperty } from "@/lib/repository";
import { ReviewActions } from "@/components/admin/review-actions";

export default async function AdminListingReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const user = await requireRole(["ADMIN"]);
  if (!user) return <p className="rounded-2xl border bg-white p-6">Admin access required. Login as admin.</p>;
  const data = getListingWithProperty(resolved.id);
  if (!data || !data.property) return notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Review Listing {data.listing.id}</h1>
      <Card>
        <p className="font-semibold">{data.property.title}</p>
        <p className="text-sm text-slate-600">{data.property.description}</p>
        <p className="mt-2 text-sm">
          {data.property.city}, {data.property.area}, {data.property.district}
        </p>
      </Card>
      <Card>
        <ReviewActions listingId={data.listing.id} />
      </Card>
    </div>
  );
}

import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getListingWithProperty, getUserById } from "@/lib/repository";
import { ReviewActions } from "@/components/admin/review-actions";
import { formatPrice } from "@/lib/utils";

export default async function AdminListingReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/admin/login");

  const data = await getListingWithProperty(resolved.id);
  if (!data || !data.property) return notFound();
  const seller = await getUserById(data.listing.userId);
  const company = seller?.companyOwnerId ? await getUserById(seller.companyOwnerId) : null;
  const price = data.property.transaction === "RENT" ? data.property.rentPrice : data.property.price;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Review Listing {data.listing.id}</h1>
      <Card className="rounded-xl border p-3">
        <div className="grid gap-3 md:grid-cols-[260px,1fr]">
          <div className="relative h-52 overflow-hidden rounded-xl">
            <Image src={data.property.images[0]} alt={data.property.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 260px" quality={72} loading="lazy" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{data.listing.status}</span>
              <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-700">{data.property.transaction}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{data.property.paymentType}</span>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  data.listing.feesPaid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}
              >
                {data.listing.feesPaid ? "Fees Paid" : "Fees Unpaid"}
              </span>
            </div>
            <p className="text-base font-semibold">{data.property.title}</p>
            <p className="text-sm text-slate-600">{data.property.description}</p>
            <p className="text-sm font-semibold text-brand-700">{formatPrice(price, data.property.currency)}</p>
            <p className="text-xs text-slate-600">
              {data.property.city} | {data.property.area} | {data.property.district}
            </p>
            <p className="text-xs text-slate-600">
              {data.property.areaSqm} sqm | {data.property.bedrooms} beds | {data.property.bathrooms} baths
            </p>
            <p className="text-xs text-slate-600">
              Seller: {seller?.name ?? data.listing.userId} ({seller?.email ?? "unknown"})
            </p>
            {company ? <p className="text-xs text-slate-600">Company: {company.name}</p> : null}
            <p className="text-xs text-slate-500">Updated: {new Date(data.listing.updatedAt).toLocaleString()}</p>
          </div>
        </div>
      </Card>
      <Card>
        <ReviewActions listingId={data.listing.id} />
      </Card>
    </div>
  );
}

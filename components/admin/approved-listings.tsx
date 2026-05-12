import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

type ApprovedItem = {
  listing: {
    id: string;
    userId: string;
    updatedAt: string;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
    adminNotes?: string | null;
    feesPaid?: boolean;
  };
  property: {
    id: string;
    title: string;
    description: string;
    transaction: "BUY" | "RENT" | "VACATION";
    paymentType: "CASH" | "INSTALLMENTS";
    price: number | null;
    rentPrice: number | null;
    currency: string;
    city: string;
    area: string;
    district: string;
    areaSqm: number;
    bedrooms: number;
    bathrooms: number;
    images: string[];
  };
  seller: {
    id: string;
    name: string;
    email: string;
    companyOwnerId?: string;
  } | null;
  company: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export function ApprovedListings({ items }: { items: ApprovedItem[] }) {
  if (items.length === 0) {
    return <p className="rounded-2xl border bg-white p-6">No approved listings.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map(({ listing, property, seller, company }) => {
        const price = property.transaction === "RENT" ? property.rentPrice : property.price;
        return (
          <Card key={listing.id} className="rounded-xl border p-3">
            <div className="grid gap-3 md:grid-cols-[220px,1fr]">
              <div className="relative h-40 overflow-hidden rounded-xl">
                <Image src={property.images[0]} alt={property.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 220px" quality={72} loading="lazy" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Approved</span>
                  <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-700">{property.transaction}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{property.paymentType}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      listing.feesPaid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {listing.feesPaid ? "Fees Paid" : "Fees Unpaid"}
                  </span>
                </div>
                <p className="text-base font-semibold">{property.title}</p>
                <p className="line-clamp-2 text-sm text-slate-600">{property.description}</p>
                <p className="text-sm font-semibold text-brand-700">{formatPrice(price, property.currency)}</p>
                <p className="text-xs text-slate-600">
                  {property.city} | {property.area} | {property.district}
                </p>
                <p className="text-xs text-slate-600">
                  {property.areaSqm} sqm | {property.bedrooms} beds | {property.bathrooms} baths
                </p>
                <p className="text-xs text-slate-600">
                  Seller: {seller?.name ?? listing.userId} ({seller?.email ?? "unknown"})
                </p>
                {company ? <p className="text-xs text-slate-600">Company: {company.name}</p> : null}
                <p className="text-xs text-slate-500">Reviewed: {new Date(listing.reviewedAt ?? listing.updatedAt).toLocaleString()}</p>
                {listing.adminNotes ? <p className="text-xs text-slate-600">Notes: {listing.adminNotes}</p> : null}
                <div className="pt-1">
                  <Link href={`/admin/listings/${listing.id}`} className="text-sm font-semibold text-brand-700">
                    View listing
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}


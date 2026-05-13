import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

type RejectedItem = {
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

export function RejectedListings({ items }: { items: RejectedItem[] }) {
  if (items.length === 0) {
    return <p className="surface-card rounded-2xl p-6">No rejected listings.</p>;
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
                  <span className="status-danger rounded-full px-2 py-1 text-xs font-semibold">Rejected</span>
                  <span className="status-brand rounded-full px-2 py-1 text-xs font-semibold">{property.transaction}</span>
                  <span className="status-neutral rounded-full px-2 py-1 text-xs font-semibold">{property.paymentType}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      listing.feesPaid ? "status-positive" : "status-danger"
                    }`}
                  >
                    {listing.feesPaid ? "Fees Paid" : "Fees Unpaid"}
                  </span>
                </div>
                <p className="text-base font-semibold">{property.title}</p>
                <p className="text-muted line-clamp-2 text-sm">{property.description}</p>
                <p className="text-sm font-semibold text-[var(--brand)]">{formatPrice(price, property.currency)}</p>
                <p className="text-muted text-xs">
                  {property.city} | {property.area} | {property.district}
                </p>
                <p className="text-muted text-xs">
                  {property.areaSqm} sqm | {property.bedrooms} beds | {property.bathrooms} baths
                </p>
                <p className="text-muted text-xs">
                  Seller: {seller?.name ?? listing.userId} ({seller?.email ?? "unknown"})
                </p>
                {company ? <p className="text-muted text-xs">Company: {company.name}</p> : null}
                <p className="text-soft text-xs">Reviewed: {new Date(listing.reviewedAt ?? listing.updatedAt).toLocaleString()}</p>
                {listing.adminNotes ? <p className="text-muted text-xs">Notes: {listing.adminNotes}</p> : null}
                <div className="pt-1">
                  <Link href={`/admin/listings/${listing.id}`} className="link-accent text-sm font-semibold">
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

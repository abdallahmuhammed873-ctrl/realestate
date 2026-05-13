import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t, translatePaymentType, translateTransaction } from "@/lib/i18n";

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
    projectName?: string | null;
    unitCode?: string | null;
    sourceType?: "MANUAL" | "IMPORTED";
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

export async function ApprovedListings({ items }: { items: ApprovedItem[] }) {
  const language = await getRequestLanguage();
  if (items.length === 0) {
    return <p className="surface-card rounded-2xl p-6">{t(language, "noApprovedListings")}</p>;
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
                  <span className="status-positive rounded-full px-2 py-1 text-xs font-semibold">{t(language, "approvedStatus")}</span>
                  <span className="status-brand rounded-full px-2 py-1 text-xs font-semibold">{translateTransaction(property.transaction, language)}</span>
                  <span className="status-neutral rounded-full px-2 py-1 text-xs font-semibold">{translatePaymentType(property.paymentType, language)}</span>
                  <span className="status-neutral rounded-full px-2 py-1 text-xs font-semibold">
                    {property.sourceType === "IMPORTED" ? t(language, "sourceImported") : t(language, "sourceManual")}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${listing.feesPaid ? "status-positive" : "status-danger"}`}>
                    {listing.feesPaid ? t(language, "feesPaid") : t(language, "feesUnpaid")}
                  </span>
                </div>
                <p className="text-base font-semibold">{property.title}</p>
                <p className="text-muted line-clamp-2 text-sm">{property.description}</p>
                <p className="text-sm font-semibold text-[var(--brand)]">{formatPrice(price, property.currency, language)}</p>
                {property.projectName || property.unitCode ? (
                  <p className="text-muted text-xs">
                    {[property.projectName, property.unitCode].filter(Boolean).join(" | ")}
                  </p>
                ) : null}
                <p className="text-muted text-xs">
                  {property.city} | {property.area} | {property.district}
                </p>
                <p className="text-muted text-xs">
                  {property.areaSqm} {t(language, "sqm")} | {property.bedrooms} {t(language, "beds")} | {property.bathrooms} {t(language, "baths")}
                </p>
                <p className="text-muted text-xs">{t(language, "sellerLabel", { name: seller?.name ?? listing.userId, email: seller?.email ?? "unknown" })}</p>
                {company ? <p className="text-muted text-xs">{t(language, "companyLabel", { name: company.name })}</p> : null}
                <p className="text-soft text-xs">{t(language, "reviewedAt", { value: new Date(listing.reviewedAt ?? listing.updatedAt).toLocaleString() })}</p>
                {listing.adminNotes ? <p className="text-muted text-xs">{t(language, "notesLabel", { value: listing.adminNotes })}</p> : null}
                <div className="pt-1">
                  <Link href={`/admin/listings/${listing.id}`} className="link-accent text-sm font-semibold">
                    {t(language, "viewListing")}
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

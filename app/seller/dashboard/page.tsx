import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { listSellerDashboard } from "@/lib/repository";
import { formatPrice } from "@/lib/utils";
import { ListingActions } from "@/components/seller/listing-actions";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t, translatePaymentType, translateTransaction } from "@/lib/i18n";
import { getPropertyCoverImage } from "@/lib/property-images";

function ListingStatusBadge({
  status,
  language
}: {
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  language: "en" | "ar";
}) {
  if (status === "APPROVED") return <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{t(language, "approvedStatus")}</span>;
  if (status === "REJECTED") return <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">{t(language, "rejectedStatus")}</span>;
  if (status === "PENDING") return <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{t(language, "pendingReview")}</span>;
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Draft</span>;
}

export default async function SellerDashboardPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["SELLER"]);
  if (!user) return <p className="rounded-2xl border bg-white p-6">{t(language, "sellerAccessRequired")}</p>;

  const data = await listSellerDashboard(user.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t(language, "sellerDashboard")}</h1>
        <div className="flex items-center gap-2">
          {!user.companyOwnerId && user.isCompanyAccount ? (
            <Link href="/seller/users" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
              {t(language, "companyUsers")}
            </Link>
          ) : null}
          <Link href="/seller/new" className="rounded-xl bg-brand-700 px-3 py-2 text-sm font-semibold text-white">
            {t(language, "newListing")}
          </Link>
        </div>
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
        <h2 className="mb-3 text-lg font-bold">{t(language, "yourListings")}</h2>
        <ul className="space-y-3">
          {data.detailed.map(({ listing, property, seller }) => {
            if (!property) {
              return (
                <li key={listing.id} className="rounded-xl border p-3">
                  <p className="text-sm font-semibold">Listing {listing.id}</p>
                  <ListingStatusBadge status={listing.status} language={language} />
                  <p className="mt-1 text-xs text-slate-600">
                    {t(language, "createdByLabel", { name: seller?.name ?? t(language, "seller") })} {seller?.companyOwnerId ? t(language, "companyUserSuffix") : ""}
                  </p>
                </li>
              );
            }

            const price = property.transaction === "RENT" ? property.rentPrice : property.price;
            const coverImage = getPropertyCoverImage(property.images);
            return (
              <li key={listing.id} className="rounded-xl border p-3">
                <div className="grid gap-3 md:grid-cols-[220px,1fr]">
                  <div className="relative h-40 overflow-hidden rounded-xl">
                    <Image src={coverImage} alt={property.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 220px" quality={72} loading="lazy" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ListingStatusBadge status={listing.status} language={language} />
                      <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-700">{translateTransaction(property.transaction, language)}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{translatePaymentType(property.paymentType, language)}</span>
                    </div>
                    <p className="text-base font-semibold">{property.title}</p>
                    <p className="line-clamp-2 text-sm text-slate-600">{property.description}</p>
                    <p className="text-sm font-semibold text-brand-700">{formatPrice(price, property.currency, language)}</p>
                    {property.projectName || property.unitCode ? (
                      <p className="text-xs text-slate-600">
                        {[property.projectName, property.unitCode].filter(Boolean).join(" | ")}
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-600">
                      {property.city} | {property.area} | {property.district}
                    </p>
                    <p className="text-xs text-slate-600">
                      {property.areaSqm} {t(language, "sqm")} | {property.bedrooms} {t(language, "beds")} | {property.bathrooms} {t(language, "baths")}
                    </p>
                    <p className="text-xs text-slate-600">
                      {t(language, "createdByLabel", { name: seller?.name ?? t(language, "seller") })} {seller?.companyOwnerId ? t(language, "companyUserSuffix") : ""}
                    </p>
                    <ListingActions listingId={listing.id} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

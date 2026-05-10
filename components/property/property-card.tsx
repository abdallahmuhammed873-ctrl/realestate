import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Language, t, translateLocation, translatePaymentType } from "@/lib/i18n";
import { PublicPropertyCard } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export function PropertyCard({ property, language = "en" }: { property: PublicPropertyCard; language?: Language }) {
  const price = property.transaction === "RENT" ? property.rentPrice : property.price;
  return (
    <Link href={`/p/${property.id}`} className="block" aria-label={`Open listing: ${property.title}`}>
      <Card className="overflow-hidden p-0 transition hover:shadow-md">
        <div className="relative h-52">
          <img src={property.images[0]} alt={property.title} className="h-full w-full object-cover" loading="lazy" />
        </div>
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap gap-2">
            {property.verified && <Badge className="bg-emerald-100 text-emerald-700">{t(language, "verified")}</Badge>}
            <Badge className="bg-brand-100 text-brand-700">{translatePaymentType(property.paymentType, language)}</Badge>
            {property.goodDeal && <Badge className="bg-cheque text-slate-900">{t(language, "goodDeal")}</Badge>}
          </div>
          <p className="text-lg font-bold">{formatPrice(price, property.currency, language)}</p>
          <h3 className="line-clamp-1 font-semibold">{property.title}</h3>
          <p className="text-sm text-slate-600">
            {property.areaSqm} {t(language, "sqm")} | {property.bedrooms} {t(language, "beds")} | {property.bathrooms} {t(language, "baths")}
          </p>
          <p className="text-sm text-slate-500">
            {translateLocation(property.city, language)}, {translateLocation(property.area, language)}, {translateLocation(property.district, language)}
            {property.distanceKm !== undefined ? ` | ${property.distanceKm} km` : ""}
          </p>
          <p className="text-xs text-slate-600">
            {t(language, "listedBy")}: {property.listedByName}
            {property.listedByCompanyName ? ` (${property.listedByCompanyName})` : ""}
          </p>
          <p className="inline-block text-sm font-semibold text-brand-700">{t(language, "viewDetails")}</p>
        </div>
      </Card>
    </Link>
  );
}

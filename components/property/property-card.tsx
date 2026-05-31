import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getLocalizedPropertyTitle, Language, t, translateLocation, translatePaymentType } from "@/lib/i18n";
import { getPropertyCoverImage } from "@/lib/property-images";
import { PublicPropertyCard } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export function PropertyCard({ property, language = "en" }: { property: PublicPropertyCard; language?: Language }) {
  const price = property.transaction === "RENT" ? property.rentPrice : property.price;
  const title = getLocalizedPropertyTitle(property, language);
  const coverImage = getPropertyCoverImage(property.images, property.media);
  return (
    <Link href={`/p/${property.id}`} className="block" aria-label={`Open listing: ${title}`}>
      <Card className="overflow-hidden p-0 transition hover:shadow-md">
        <div className="relative h-52">
          <img src={coverImage} alt={title} className="h-full w-full object-cover" loading="lazy" />
        </div>
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap gap-2">
            {property.verified && <Badge className="status-positive">{t(language, "verified")}</Badge>}
            <Badge className="status-brand">{translatePaymentType(property.paymentType, language)}</Badge>
            {property.has360View && <Badge className="status-brand">{t(language, "has360View")}</Badge>}
            {property.goodDeal && <Badge className="bg-[var(--cheque)] text-[var(--cheque-ink)]">{t(language, "goodDeal")}</Badge>}
          </div>
          <p className="text-lg font-bold">{formatPrice(price, property.currency, language)}</p>
          <h3 className="line-clamp-1 font-semibold">{title}</h3>
          <p className="text-muted text-sm">
            {property.areaSqm} {t(language, "sqm")} | {property.bedrooms} {t(language, "beds")} | {property.bathrooms} {t(language, "baths")}
          </p>
          <p className="text-soft text-sm">
            {translateLocation(property.city, language)}, {translateLocation(property.area, language)}, {translateLocation(property.district, language)}
            {property.distanceKm !== undefined ? ` | ${property.distanceKm} km` : ""}
          </p>
          <p className="text-muted text-xs">
            {t(language, "listedBy")}: {property.listedByName}
            {property.listedByCompanyName ? ` (${property.listedByCompanyName})` : ""}
          </p>
          <p className="link-accent inline-block text-sm font-semibold">{t(language, "viewDetails")}</p>
        </div>
      </Card>
    </Link>
  );
}

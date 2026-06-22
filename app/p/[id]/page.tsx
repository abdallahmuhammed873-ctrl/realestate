import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FavoriteToggle } from "@/components/property/favorite-toggle";
import { CompareToggle } from "@/components/property/compare-toggle";
import { BookViewingModal } from "@/components/property/book-viewing-modal";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PropertyCard } from "@/components/property/property-card";
import { ContactActions } from "@/components/property/contact-actions";
import { OSMMapView } from "@/components/maps/osm-map";
import { GoogleMapsButton } from "@/components/maps/google-maps-button";
import { getRequestLanguage } from "@/lib/i18n-server";
import { getCurrentUserId } from "@/lib/auth";
import { getPublicPropertyById, getRecommendations, trackPropertyView } from "@/lib/repository";
import { formatPrice } from "@/lib/utils";
import {
  getLocalizedPropertyDescription,
  getLocalizedPropertyTitle,
  t,
  translateAmenity,
  translatePaymentType
} from "@/lib/i18n";

export default async function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const language = await getRequestLanguage();
  const property = await getPublicPropertyById(resolved.id);
  if (!property) return notFound();
  const [userId, headerStore] = await Promise.all([getCurrentUserId(), headers()]);
  await trackPropertyView({
    propertyId: property.id,
    userId,
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip"),
    userAgent: headerStore.get("user-agent")
  });
  const rec = await getRecommendations(userId ?? undefined, property.id);
  const price = property.transaction === "RENT" ? property.rentPrice : property.price;
  const title = getLocalizedPropertyTitle(property, language);
  const description = getLocalizedPropertyDescription(property, language);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <Card className="p-0">
          <PropertyGallery images={property.images} media={property.media} title={title} />
        </Card>
        <Card>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {property.verified && <Badge className="status-positive">{t(language, "verifiedByPlatform")}</Badge>}
              <Badge className="status-brand">{translatePaymentType(property.paymentType, language)}</Badge>
              {property.has360View && <Badge className="status-brand">{t(language, "has360View")}</Badge>}
            </div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-xl font-bold">{formatPrice(price, property.currency, language)}</p>
            <p className="text-muted text-sm">{property.address}</p>
            <p className="text-muted text-sm">
              {property.bedrooms} {t(language, "beds")} | {property.bathrooms} {t(language, "baths")} | {property.areaSqm} {t(language, "sqm")}
            </p>
            <p className="text-muted text-sm">
              {t(language, "listedBy")}: {property.listedByName}
              {property.listedByCompanyName ? ` (${property.listedByCompanyName})` : ""}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <BookViewingModal propertyId={property.id} />
              <FavoriteToggle propertyId={property.id} />
              <CompareToggle propertyId={property.id} />
            </div>
            <ContactActions phone={property.listedByPhone} />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-2 text-lg font-bold">{t(language, "details")}</h2>
        <p className="text-muted text-sm">{description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {property.amenities.map((a) => (
            <Badge key={a} className="status-neutral">
              {translateAmenity(a, language)}
            </Badge>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-bold">{t(language, "mapAndDistance")}</h2>
        <OSMMapView lat={property.lat} lng={property.lng} />
        <p className="text-soft mt-2 text-xs">
          {t(language, "coordinates")}: {property.lat}, {property.lng}
        </p>
        <GoogleMapsButton lat={property.lat} lng={property.lng} />
      </Card>

      <section>
        <h2 className="mb-3 text-xl font-bold">{t(language, "recommendedForYou")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {rec.map((p) => (
            <PropertyCard key={p.id} property={p} language={language} />
          ))}
        </div>
      </section>
    </div>
  );
}

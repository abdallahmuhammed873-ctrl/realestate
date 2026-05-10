import { notFound } from "next/navigation";
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
import { getPublicPropertyById, getRecommendations } from "@/lib/repository";
import { formatPrice } from "@/lib/utils";

export default async function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const property = getPublicPropertyById(resolved.id);
  if (!property) return notFound();
  const rec = getRecommendations("u-buyer-1", property.id);
  const price = property.transaction === "RENT" ? property.rentPrice : property.price;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <Card className="p-0">
          <PropertyGallery images={property.images} title={property.title} />
        </Card>
        <Card>
          <div className="space-y-2">
            <div className="flex gap-2">
              {property.verified && <Badge className="bg-emerald-100 text-emerald-700">Verified by platform</Badge>}
              <Badge className="bg-brand-100 text-brand-700">{property.paymentType}</Badge>
            </div>
            <h1 className="text-2xl font-bold">{property.title}</h1>
            <p className="text-xl font-bold">{formatPrice(price, property.currency)}</p>
            <p className="text-sm text-slate-600">{property.address}</p>
            <p className="text-sm text-slate-600">
              {property.bedrooms} beds | {property.bathrooms} baths | {property.areaSqm} sqm
            </p>
            <p className="text-sm text-slate-600">
              Listed by: {property.listedByName}
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
        <h2 className="mb-2 text-lg font-bold">Details</h2>
        <p className="text-sm text-slate-700">{property.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {property.amenities.map((a) => (
            <Badge key={a} className="bg-slate-100 text-slate-700">
              {a}
            </Badge>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-bold">Map & Distance</h2>
        <OSMMapView lat={property.lat} lng={property.lng} />
        <p className="mt-2 text-xs text-slate-500">Coordinates: {property.lat}, {property.lng}</p>
        <GoogleMapsButton lat={property.lat} lng={property.lng} />
      </Card>

      <section>
        <h2 className="mb-3 text-xl font-bold">Recommended for you</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {rec.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

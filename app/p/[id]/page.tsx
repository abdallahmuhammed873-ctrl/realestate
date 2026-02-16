import { notFound } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FavoriteToggle } from "@/components/property/favorite-toggle";
import { CompareToggle } from "@/components/property/compare-toggle";
import { BookViewingModal } from "@/components/property/book-viewing-modal";
import { PropertyCard } from "@/components/property/property-card";
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
          <div className="relative h-80 w-full">
            <Image src={property.images[0]} alt={property.title} fill className="rounded-2xl object-cover" />
          </div>
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
              {property.bedrooms} beds · {property.bathrooms} baths · {property.areaSqm} sqm
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <BookViewingModal propertyId={property.id} />
              <FavoriteToggle propertyId={property.id} />
              <CompareToggle propertyId={property.id} />
            </div>
            <div className="pt-2 text-sm">
              <a href="#" className="mr-3 text-brand-700">
                WhatsApp (stub)
              </a>
              <a href="#" className="text-brand-700">
                Call (stub)
              </a>
            </div>
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
        <div className="grid h-48 place-items-center rounded-xl border border-dashed text-sm text-slate-500">
          Map placeholder ({property.lat}, {property.lng})
        </div>
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

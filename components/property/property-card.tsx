import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PublicPropertyCard } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export function PropertyCard({ property }: { property: PublicPropertyCard }) {
  const price = property.transaction === "RENT" ? property.rentPrice : property.price;
  return (
    <Card className="overflow-hidden p-0">
      <div className="relative h-52">
        <Image src={property.images[0]} alt={property.title} fill className="object-cover" />
      </div>
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap gap-2">
          {property.verified && <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>}
          <Badge className="bg-brand-100 text-brand-700">{property.paymentType}</Badge>
          {property.goodDeal && <Badge className="bg-cheque text-slate-900">Good deal</Badge>}
        </div>
        <p className="text-lg font-bold">{formatPrice(price, property.currency)}</p>
        <h3 className="line-clamp-1 font-semibold">{property.title}</h3>
        <p className="text-sm text-slate-600">
          {property.areaSqm} sqm · {property.bedrooms} beds · {property.bathrooms} baths
        </p>
        <p className="text-sm text-slate-500">
          {property.city}, {property.area}, {property.district}
          {property.distanceKm !== undefined ? ` · ${property.distanceKm} km` : ""}
        </p>
        <Link href={`/p/${property.id}`} className="inline-block text-sm font-semibold text-brand-700">
          View Details
        </Link>
      </div>
    </Card>
  );
}

import type { Appointment, Property, PropertyMedia, PublicPropertyCard, User } from "./types.ts";

type NotificationItem = {
  id: string;
  text: string;
  createdAt: string;
  href?: string;
  read?: boolean;
};

type MobileMediaContext = {
  origin: string;
};

function normalizePathToAbsoluteUrl(path: string, origin: string) {
  const trimmed = path.trim();
  if (!trimmed) return trimmed;
  if (/^(https?:|data:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `http:${trimmed}`;
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return new URL(normalizedPath, origin).toString();
}

export function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto || "http"}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export function toAbsoluteMediaUrl(path: string | null | undefined, origin: string) {
  if (!path) return null;
  return normalizePathToAbsoluteUrl(path, origin);
}

export function toMobileUser(user: User | null | undefined, context?: Partial<MobileMediaContext>) {
  if (!user) return null;
  const avatarUrl = context?.origin ? toAbsoluteMediaUrl(user.avatarUrl ?? user.avatarPath ?? null, context.origin) : user.avatarUrl ?? user.avatarPath ?? null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    avatarUrl,
    isCompanyAccount: Boolean(user.isCompanyAccount),
    companyOwnerId: user.companyOwnerId ?? null
  };
}

export function toMobilePropertyMedia(media: PropertyMedia, context: MobileMediaContext) {
  return {
    id: media.id,
    kind: media.kind,
    path: media.path,
    url: toAbsoluteMediaUrl(media.path, context.origin),
    label: media.label ?? null,
    altText: media.altText ?? null,
    sortOrder: media.sortOrder,
    mimeType: media.mimeType ?? null
  };
}

export function toMobileProperty(property: Property, context: MobileMediaContext) {
  return {
    id: property.id,
    listingId: property.listingId,
    title: property.title,
    description: property.description,
    projectName: property.projectName ?? null,
    unitCode: property.unitCode ?? null,
    inventoryStatus: property.inventoryStatus ?? null,
    transaction: property.transaction,
    type: property.type,
    price: property.price,
    rentPrice: property.rentPrice,
    currency: property.currency,
    pricePerSqm: property.pricePerSqm ?? null,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    areaSqm: property.areaSqm,
    landArea: property.landArea ?? null,
    gardenArea: property.gardenArea ?? null,
    roofArea: property.roofArea ?? null,
    hasGarden: Boolean(property.hasGarden),
    hasRoof: Boolean(property.hasRoof),
    address: property.address,
    city: property.city,
    area: property.area,
    district: property.district,
    lat: property.lat,
    lng: property.lng,
    furnishing: property.furnishing,
    paymentType: property.paymentType,
    completionStatus: property.completionStatus,
    amenities: property.amenities,
    imageUrls: property.images.map((image) => normalizePathToAbsoluteUrl(image, context.origin)),
    media: (property.media ?? []).map((media) => toMobilePropertyMedia(media, context)),
    installmentDownPayment: property.installmentDownPayment ?? null,
    installmentYears: property.installmentYears ?? null,
    installmentMonthly: property.installmentMonthly ?? null,
    sourceType: property.sourceType ?? null,
    sourceFile: property.sourceFile ?? null,
    sourceSheet: property.sourceSheet ?? null,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt
  };
}

export function toMobilePublicProperty(property: PublicPropertyCard, context: MobileMediaContext) {
  return {
    ...toMobileProperty(property, context),
    listing: {
      status: property.listingStatus,
      verified: property.verified
    },
    seller: {
      id: property.sellerId,
      name: property.listedByName,
      companyName: property.listedByCompanyName ?? null,
      phone: property.listedByPhone ?? null
    },
    distanceKm: property.distanceKm ?? null
  };
}

export function toMobilePropertySearchResponse(
  result: { total: number; page: number; pageSize: number; items: PublicPropertyCard[] },
  origin: string
) {
  return {
    items: result.items.map((item) => toMobilePublicProperty(item, { origin })),
    pagination: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: Math.max(1, Math.ceil(result.total / result.pageSize))
    }
  };
}

export function toMobileNotification(notification: NotificationItem, origin: string) {
  return {
    id: notification.id,
    text: notification.text,
    createdAt: notification.createdAt,
    href: notification.href ? normalizePathToAbsoluteUrl(notification.href, origin) : null,
    read: Boolean(notification.read)
  };
}

export function toMobileAppointment(appointment: Appointment) {
  return {
    id: appointment.id,
    propertyId: appointment.propertyId,
    datetime: appointment.datetime,
    status: appointment.status,
    contactName: appointment.contactName,
    contactPhone: appointment.contactPhone,
    notes: appointment.notes ?? null,
    suggestedSlots: appointment.suggestedSlots,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt
  };
}

import {
  Appointment,
  Favorite,
  Listing,
  ListingStatus,
  Property,
  PublicPropertyCard,
  SavedSearch,
  SearchFilters,
  SearchResult,
  User
} from "@/lib/types";
import {
  seedAppointments,
  seedFavorites,
  seedListings,
  seedProperties,
  seedSavedSearches,
  seedUsers
} from "@/lib/mock-data";
import { haversineDistanceKm } from "@/lib/utils";

type MockDb = {
  users: User[];
  listings: Listing[];
  properties: Property[];
  favorites: Favorite[];
  appointments: Appointment[];
  savedSearches: SavedSearch[];
  compareByUser: Record<string, string[]>;
};

const globalDb = globalThis as unknown as { __chequeDb?: MockDb };

function createDb(): MockDb {
  return {
    users: structuredClone(seedUsers),
    listings: structuredClone(seedListings),
    properties: structuredClone(seedProperties),
    favorites: structuredClone(seedFavorites),
    appointments: structuredClone(seedAppointments),
    savedSearches: structuredClone(seedSavedSearches),
    compareByUser: {}
  };
}

function db() {
  if (!globalDb.__chequeDb) globalDb.__chequeDb = createDb();
  return globalDb.__chequeDb;
}

export function getUserById(id?: string | null) {
  if (!id) return null;
  return db().users.find((u) => u.id === id) ?? null;
}

export function listPendingListings() {
  return db().listings.filter((l) => l.status === "PENDING");
}

export function getListingWithProperty(listingId: string) {
  const listing = db().listings.find((l) => l.id === listingId);
  if (!listing) return null;
  const property = db().properties.find((p) => p.listingId === listingId) ?? null;
  return { listing, property };
}

export function updateListingStatus(listingId: string, status: Exclude<ListingStatus, "DRAFT" | "PENDING">, adminId: string, notes?: string) {
  const listing = db().listings.find((l) => l.id === listingId);
  if (!listing) return null;
  listing.status = status;
  listing.adminNotes = notes ?? null;
  listing.reviewedBy = adminId;
  listing.reviewedAt = new Date().toISOString();
  listing.updatedAt = new Date().toISOString();
  return listing;
}

export function createOrUpdateSellerListing(input: { listingId?: string; sellerId: string; property: Omit<Property, "id" | "listingId" | "createdAt" | "updatedAt"> }) {
  const now = new Date().toISOString();
  if (input.listingId) {
    const listing = db().listings.find((l) => l.id === input.listingId && l.userId === input.sellerId);
    const property = db().properties.find((p) => p.listingId === input.listingId);
    if (!listing || !property) return null;
    listing.status = "PENDING";
    listing.updatedAt = now;
    Object.assign(property, input.property, { updatedAt: now });
    return { listing, property };
  }
  const listingId = `l-${db().listings.length + 1}`;
  const propertyId = `p-${db().properties.length + 1}`;
  const listing: Listing = {
    id: listingId,
    userId: input.sellerId,
    status: "PENDING",
    createdAt: now,
    updatedAt: now
  };
  const property: Property = {
    id: propertyId,
    listingId,
    ...input.property,
    createdAt: now,
    updatedAt: now
  };
  db().listings.push(listing);
  db().properties.push(property);
  return { listing, property };
}

function basePublicCards() {
  return db().properties
    .map((property) => {
      const listing = db().listings.find((l) => l.id === property.listingId);
      if (!listing) return null;
      const valueForDeal = property.transaction === "RENT" ? property.rentPrice ?? 0 : property.price ?? 0;
      return {
        ...property,
        listingStatus: listing.status,
        verified: listing.status === "APPROVED",
        sellerId: listing.userId,
        goodDeal: property.areaSqm > 0 ? valueForDeal / property.areaSqm < 28000 : false
      } as PublicPropertyCard;
    })
    .filter((x): x is PublicPropertyCard => Boolean(x));
}

function currentPrice(item: PublicPropertyCard) {
  return item.transaction === "RENT" ? item.rentPrice ?? 0 : item.price ?? 0;
}

export function searchProperties(filters: SearchFilters): SearchResult {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, Math.min(40, filters.pageSize ?? 20));
  let items = basePublicCards().filter((x) => x.listingStatus === "APPROVED");

  if (filters.q) {
    const q = filters.q.toLowerCase();
    items = items.filter((x) => `${x.title} ${x.description}`.toLowerCase().includes(q));
  }
  if (filters.transaction) items = items.filter((x) => x.transaction === filters.transaction);
  if (filters.type && filters.type.length > 0) items = items.filter((x) => filters.type?.includes(x.type));
  if (filters.city) items = items.filter((x) => x.city === filters.city);
  if (filters.area) items = items.filter((x) => x.area === filters.area);
  if (filters.district) items = items.filter((x) => x.district === filters.district);
  if (filters.minPrice !== undefined) items = items.filter((x) => currentPrice(x) >= filters.minPrice!);
  if (filters.maxPrice !== undefined) items = items.filter((x) => currentPrice(x) <= filters.maxPrice!);
  if (filters.minArea !== undefined) items = items.filter((x) => x.areaSqm >= filters.minArea!);
  if (filters.maxArea !== undefined) items = items.filter((x) => x.areaSqm <= filters.maxArea!);
  if (filters.minBeds !== undefined) items = items.filter((x) => x.bedrooms >= filters.minBeds!);
  if (filters.maxBeds !== undefined) items = items.filter((x) => x.bedrooms <= filters.maxBeds!);
  if (filters.minBaths !== undefined) items = items.filter((x) => x.bathrooms >= filters.minBaths!);
  if (filters.maxBaths !== undefined) items = items.filter((x) => x.bathrooms <= filters.maxBaths!);
  if (filters.paymentType) items = items.filter((x) => x.paymentType === filters.paymentType);
  if (filters.furnishing) items = items.filter((x) => x.furnishing === filters.furnishing);
  if (filters.completionStatus) items = items.filter((x) => x.completionStatus === filters.completionStatus);
  if (filters.amenities && filters.amenities.length > 0) {
    items = items.filter((x) => filters.amenities!.every((a) => x.amenities.includes(a)));
  }
  if (filters.downPaymentMax !== undefined) {
    items = items.filter((x) => (x.installmentDownPayment ?? Number.MAX_SAFE_INTEGER) <= filters.downPaymentMax!);
  }
  if (filters.installmentYearsMax !== undefined) {
    items = items.filter((x) => (x.installmentYears ?? Number.MAX_SAFE_INTEGER) <= filters.installmentYearsMax!);
  }
  if (filters.installmentMonthlyMax !== undefined) {
    items = items.filter((x) => (x.installmentMonthly ?? Number.MAX_SAFE_INTEGER) <= filters.installmentMonthlyMax!);
  }
  if (filters.lat !== undefined && filters.lng !== undefined) {
    items = items.map((x) => ({ ...x, distanceKm: haversineDistanceKm(filters.lat!, filters.lng!, x.lat, x.lng) }));
    if (filters.distanceKm !== undefined) items = items.filter((x) => (x.distanceKm ?? 0) <= filters.distanceKm!);
  }

  const sort = filters.sort ?? "FEATURED";
  items.sort((a, b) => {
    if (sort === "FEATURED") return Number(b.goodDeal) - Number(a.goodDeal) || currentPrice(a) - currentPrice(b);
    if (sort === "NEWEST") return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (sort === "PRICE_ASC") return currentPrice(a) - currentPrice(b);
    if (sort === "PRICE_DESC") return currentPrice(b) - currentPrice(a);
    if (sort === "AREA_DESC") return b.areaSqm - a.areaSqm;
    if (sort === "DISTANCE_ASC") return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
    return 0;
  });

  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    total,
    page,
    pageSize,
    items: items.slice(start, start + pageSize)
  };
}

export function getPublicPropertyById(id: string) {
  return basePublicCards().find((x) => x.id === id && x.listingStatus === "APPROVED") ?? null;
}

export function getPropertyForSeller(id: string, sellerId: string) {
  const p = db().properties.find((x) => x.id === id);
  if (!p) return null;
  const listing = db().listings.find((x) => x.id === p.listingId);
  if (!listing || listing.userId !== sellerId) return null;
  return { property: p, listing };
}

export function getSellerListingById(listingId: string, sellerId: string) {
  const listing = db().listings.find((x) => x.id === listingId && x.userId === sellerId);
  if (!listing) return null;
  const property = db().properties.find((x) => x.listingId === listing.id);
  if (!property) return null;
  return { listing, property };
}

export function listSellerDashboard(sellerId: string) {
  const listings = db().listings.filter((l) => l.userId === sellerId);
  const byStatus = listings.reduce<Record<ListingStatus, number>>(
    (acc, l) => {
      acc[l.status] += 1;
      return acc;
    },
    { DRAFT: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 }
  );
  const detailed = listings.map((listing) => ({
    listing,
    property: db().properties.find((p) => p.listingId === listing.id) ?? null
  }));
  return { listings, byStatus, detailed };
}

export function listFavorites(userId: string) {
  const favoriteIds = db().favorites.filter((f) => f.userId === userId).map((f) => f.propertyId);
  return basePublicCards().filter((x) => favoriteIds.includes(x.id) && x.listingStatus === "APPROVED");
}

export function toggleFavorite(userId: string, propertyId: string) {
  const existing = db().favorites.find((f) => f.userId === userId && f.propertyId === propertyId);
  if (existing) {
    db().favorites = db().favorites.filter((f) => f.id !== existing.id);
    return { saved: false };
  }
  db().favorites.push({ id: `fav-${db().favorites.length + 1}`, userId, propertyId, createdAt: new Date().toISOString() });
  return { saved: true };
}

export function createAppointment(input: Omit<Appointment, "id" | "status" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const appointment: Appointment = {
    ...input,
    id: `ap-${db().appointments.length + 1}`,
    status: "PENDING",
    createdAt: now,
    updatedAt: now
  };
  db().appointments.push(appointment);
  return appointment;
}

export function createSavedSearch(userId: string, queryJson: string) {
  const entry: SavedSearch = {
    id: `ss-${db().savedSearches.length + 1}`,
    userId,
    queryJson,
    createdAt: new Date().toISOString()
  };
  db().savedSearches.push(entry);
  return entry;
}

export function getRecommendations(userId?: string, currentPropertyId?: string) {
  const source = basePublicCards().filter((x) => x.listingStatus === "APPROVED");
  const favorites = userId ? db().favorites.filter((f) => f.userId === userId) : [];
  const favoriteProperties = source.filter((p) => favorites.some((f) => f.propertyId === p.id));
  const favoriteAreas = new Set(favoriteProperties.map((p) => p.area));
  const favoriteTypes = new Set(favoriteProperties.map((p) => p.type));
  const current = currentPropertyId ? source.find((p) => p.id === currentPropertyId) : null;

  return source
    .filter((x) => x.id !== currentPropertyId)
    .map((x) => {
      let score = 0;
      if (favoriteAreas.has(x.area)) score += 2;
      if (favoriteTypes.has(x.type)) score += 2;
      if (current && current.area === x.area) score += 3;
      if (current && current.type === x.type) score += 1;
      if (x.goodDeal) score += 1;
      return { ...x, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export function getCompareIds(userId: string) {
  return db().compareByUser[userId] ?? [];
}

export function setCompareIds(userId: string, ids: string[]) {
  db().compareByUser[userId] = ids.slice(0, 4);
  return db().compareByUser[userId];
}

export function listNotifications(userId: string) {
  const appointmentNotes = db()
    .appointments.filter((a) => a.userId === userId)
    .map((a) => ({
      id: `n-ap-${a.id}`,
      text: `Viewing request for ${a.propertyId} is ${a.status.toLowerCase()}.`,
      createdAt: a.createdAt
    }));
  const savedSearchNotes = db()
    .savedSearches.filter((s) => s.userId === userId)
    .map((s) => ({
      id: `n-ss-${s.id}`,
      text: "Saved search alert is active.",
      createdAt: s.createdAt
    }));
  return [...appointmentNotes, ...savedSearchNotes].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);
}

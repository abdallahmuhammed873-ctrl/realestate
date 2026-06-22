import type { ListingStatus, Prisma, PropertyType, Role, TransactionType } from "@prisma/client";
import { prisma } from "../server/prisma.ts";

export type AnalyticsEventType =
  | "PROPERTY_VIEW"
  | "PROPERTY_FAVORITE"
  | "PROPERTY_COMPARE"
  | "PROPERTY_SOLD"
  | "APPOINTMENT_REQUEST"
  | "SEARCH"
  | "PRICE_ESTIMATE";

export type AnalyticsOption = {
  value: string;
  label: string;
};

export type AnalyticsFilters = {
  startDate?: string;
  endDate?: string;
  cities: string[];
  governorates: string[];
  propertyTypes: PropertyType[];
  transactionTypes: TransactionType[];
  listingStatuses: ListingStatus[];
  sellerIds: string[];
  developerIds: string[];
  buyerIds: string[];
  userTypes: Array<"BUYER" | "SELLER" | "DEVELOPER" | "ADMIN">;
  minPrice?: number;
  maxPrice?: number;
  minAiPrice?: number;
  maxAiPrice?: number;
};

export type AnalyticsDashboard = {
  filters: AnalyticsFilters;
  filterOptions: {
    cities: AnalyticsOption[];
    governorates: AnalyticsOption[];
    propertyTypes: AnalyticsOption[];
    transactionTypes: AnalyticsOption[];
    listingStatuses: AnalyticsOption[];
    sellers: AnalyticsOption[];
    developers: AnalyticsOption[];
    buyers: AnalyticsOption[];
    userTypes: AnalyticsOption[];
    priceRange: { min: number | null; max: number | null };
    aiPriceRange: { min: number | null; max: number | null };
  };
  totals: {
    totalUsers: number;
    totalBuyers: number;
    totalSellers: number;
    totalDevelopers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalProperties: number;
    totalListings: number;
    pendingListings: number;
    approvedListings: number;
    rejectedListings: number;
    totalAppointments: number;
    totalFavorites: number;
    totalPriceEstimates: number;
    totalSearches: number;
    approvalRate: number;
    rejectionRate: number;
    averagePropertyPrice: number | null;
    averageAiPredictedPrice: number | null;
    totalSoldProperties: number;
    averageDaysUntilSale: number | null;
    totalSoldRevenueValue: number;
  };
  charts: {
    propertiesByCity: CountDatum[];
    propertiesByGovernorate: CountDatum[];
    propertiesByType: CountDatum[];
    propertiesByTransaction: CountDatum[];
    listingsByStatus: CountDatum[];
    topCitiesByListings: CountDatum[];
    topPropertyTypes: CountDatum[];
    averagePriceByCity: ValueDatum[];
    averagePriceByPropertyType: ValueDatum[];
    userRoleMix: CountDatum[];
    activeVsInactiveUsers: CountDatum[];
    userRegistrationSources: CountDatum[];
    newUsersPerMonth: TrendDatum[];
    userGrowthTrend: TrendDatum[];
    listingsCreatedPerMonth: TrendDatum[];
    listingStatusPerMonth: StackedDatum[];
    dailyActivityTrend: TrendDatum[];
    weeklyActivityTrend: TrendDatum[];
    monthlyActivityTrend: TrendDatum[];
    totalPropertiesGrowth: TrendDatum[];
    totalUsersGrowth: TrendDatum[];
    aiPredictionsPerDay: TrendDatum[];
    aiPredictionsPerMonth: TrendDatum[];
    averagePredictedPriceByCity: ValueDatum[];
    averagePredictedPriceByPropertyType: ValueDatum[];
    highestPredictedPriceAreas: ValueDatum[];
    aiUsageTrend: TrendDatum[];
    mostSearchedCities: CountDatum[];
    mostSearchedPropertyTypes: CountDatum[];
    searchActivityTrend: TrendDatum[];
    searchRequestsPerDay: TrendDatum[];
    listingConversionFunnel: CountDatum[];
    systemActivityOverview: CountDatum[];
    propertyPriceScatter: ScatterDatum[];
    activityHeatmap: HeatmapDatum[];
    soldPropertiesByCity: CountDatum[];
    soldPropertiesByGovernorate: CountDatum[];
    soldPropertiesByType: CountDatum[];
    soldPropertiesByDeveloper: CountDatum[];
    soldPropertiesBySeller: CountDatum[];
    soldPropertiesPerMonth: TrendDatum[];
    soldPropertiesPerYear: TrendDatum[];
    fastestSellingPropertyTypes: ValueDatum[];
    highestSellingCities: CountDatum[];
    soldValueByMonth: ValueDatum[];
  };
  tables: {
    mostViewedProperties: PropertyCountRow[];
    mostFavoritedProperties: PropertyCountRow[];
    newestUsers: Array<{ id: string; name: string; email: string; role: Role; isCompanyAccount: boolean; createdAt: string }>;
    newestProperties: Array<{
      id: string;
      title: string;
      titleEn?: string | null;
      titleAr?: string | null;
      city: string;
      area: string;
      price: number | null;
      currency: string;
      status: ListingStatus;
      createdAt: string;
    }>;
  };
  generatedAt: string;
};

type CountDatum = { label: string; count: number };
type ValueDatum = { label: string; value: number };
type TrendDatum = { label: string; count: number };
type StackedDatum = { label: string; values: Record<string, number> };
type ScatterDatum = { label: string; x: number; y: number; city: string; type: PropertyType };
type HeatmapDatum = { day: number; hour: number; count: number };

type PropertyCountRow = {
  propertyId: string;
  title: string;
  titleEn?: string | null;
  titleAr?: string | null;
  city: string;
  area: string;
  price: number | null;
  currency: string;
  count: number;
};

type AnalyticsFilterInput = Record<string, string | string[] | undefined>;

const LISTING_STATUSES: ListingStatus[] = ["DRAFT", "PENDING", "APPROVED", "REJECTED"];
const PROPERTY_TYPES: PropertyType[] = ["APARTMENT", "VILLA", "DUPLEX", "PENTHOUSE", "CHALET", "LAND", "COMMERCIAL"];
const TRANSACTION_TYPES: TransactionType[] = ["BUY", "RENT", "VACATION"];
const USER_TYPES: AnalyticsFilters["userTypes"] = ["BUYER", "SELLER", "DEVELOPER", "ADMIN"];
const FILTER_OPTIONS_TTL_MS = 60_000;

const CITY_GOVERNORATE_MAP: Record<string, string> = {
  Cairo: "Cairo",
  "New Cairo": "Cairo",
  Giza: "Giza",
  "Sheikh Zayed": "Giza",
  "6th of October": "Giza",
  Alexandria: "Alexandria",
  "North Coast": "Matrouh",
  "Ain Sokhna": "Suez",
  Hurghada: "Red Sea",
  "Sharm El-Sheikh": "South Sinai"
};

let filterOptionsCache: { expiresAt: number; value: AnalyticsDashboard["filterOptions"] } | null = null;

export async function trackAnalyticsEvent(input: {
  userId?: string | null;
  propertyId?: string | null;
  eventType: AnalyticsEventType;
  metadata?: Prisma.InputJsonValue;
}) {
  const metadata = input.metadata === undefined ? undefined : JSON.parse(JSON.stringify(input.metadata));
  await prisma.analyticsEvent
    .create({
      data: {
        userId: input.userId ?? null,
        propertyId: input.propertyId ?? null,
        eventType: input.eventType,
        metadata
      }
    })
    .catch(() => undefined);
}

export async function trackPropertyView(input: {
  propertyId: string;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await prisma.propertyView
    .create({
      data: {
        propertyId: input.propertyId,
        userId: input.userId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null
      }
    })
    .catch(() => undefined);

  await trackAnalyticsEvent({
    userId: input.userId,
    propertyId: input.propertyId,
    eventType: "PROPERTY_VIEW"
  });
}

function normalizeList(values: Array<string | undefined>) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => String(value ?? "").split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function inputValues(input: AnalyticsFilterInput | undefined, ...keys: string[]) {
  if (!input) return [];
  const values: Array<string | undefined> = [];
  for (const key of keys) {
    const value = input[key];
    if (Array.isArray(value)) values.push(...value);
    else values.push(value);
  }
  return normalizeList(values);
}

function pickEnum<T extends string>(values: string[], allowed: readonly T[]) {
  const allowedSet = new Set<string>(allowed);
  return values.filter((value): value is T => allowedSet.has(value));
}

function parseNumberValue(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDateValue(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : raw;
}

export function normalizeAnalyticsFilters(input?: AnalyticsFilterInput): AnalyticsFilters {
  return {
    startDate: parseDateValue(input?.startDate),
    endDate: parseDateValue(input?.endDate),
    cities: inputValues(input, "city", "cities"),
    governorates: inputValues(input, "governorate", "governorates"),
    propertyTypes: pickEnum(inputValues(input, "propertyType", "propertyTypes"), PROPERTY_TYPES),
    transactionTypes: pickEnum(inputValues(input, "transactionType", "transactionTypes"), TRANSACTION_TYPES),
    listingStatuses: pickEnum(inputValues(input, "listingStatus", "listingStatuses"), LISTING_STATUSES),
    sellerIds: inputValues(input, "seller", "sellerIds"),
    developerIds: inputValues(input, "developer", "developerIds"),
    buyerIds: inputValues(input, "buyer", "buyerIds"),
    userTypes: pickEnum(inputValues(input, "userType", "userTypes"), USER_TYPES),
    minPrice: parseNumberValue(input?.minPrice),
    maxPrice: parseNumberValue(input?.maxPrice),
    minAiPrice: parseNumberValue(input?.minAiPrice),
    maxAiPrice: parseNumberValue(input?.maxAiPrice)
  };
}

function dateRange(startDate?: string, endDate?: string) {
  const range: Prisma.DateTimeFilter = {};
  if (startDate) range.gte = new Date(`${startDate}T00:00:00.000Z`);
  if (endDate) range.lte = new Date(`${endDate}T23:59:59.999Z`);
  return Object.keys(range).length > 0 ? range : undefined;
}

function cityToGovernorate(city: string) {
  return CITY_GOVERNORATE_MAP[city] ?? city;
}

function citiesForGovernorates(governorates: string[]) {
  if (governorates.length === 0) return [];
  const selected = new Set(governorates);
  return Object.entries(CITY_GOVERNORATE_MAP)
    .filter(([, governorate]) => selected.has(governorate))
    .map(([city]) => city);
}

function selectedCities(filters: AnalyticsFilters) {
  return Array.from(new Set([...filters.cities, ...citiesForGovernorates(filters.governorates)]));
}

function propertyPrice(property: { price: number | null; rentPrice?: number | null }) {
  return property.price ?? property.rentPrice ?? null;
}

function daysBetween(start: Date, end: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / msPerDay));
}

function priceRangeWhere(min?: number, max?: number): Prisma.PropertyWhereInput | undefined {
  if (min == null && max == null) return undefined;
  const range: Prisma.IntNullableFilter = {};
  if (min != null) range.gte = Math.floor(min);
  if (max != null) range.lte = Math.ceil(max);
  return { OR: [{ price: range }, { rentPrice: range }] };
}

function buildPropertyWhere(filters: AnalyticsFilters, options: { includeCreatedAt?: boolean } = {}) {
  const includeCreatedAt = options.includeCreatedAt ?? true;
  const cities = selectedCities(filters);
  const createdAt = dateRange(filters.startDate, filters.endDate);
  const priceWhere = priceRangeWhere(filters.minPrice, filters.maxPrice);
  const clauses: Prisma.PropertyWhereInput[] = [];
  if (cities.length) clauses.push({ city: { in: cities } });
  if (filters.propertyTypes.length) clauses.push({ type: { in: filters.propertyTypes } });
  if (filters.transactionTypes.length) clauses.push({ transaction: { in: filters.transactionTypes } });
  if (includeCreatedAt && createdAt) clauses.push({ createdAt });
  if (priceWhere) clauses.push(priceWhere);
  return clauses.length ? { AND: clauses } : {};
}

function buildListingWhere(filters: AnalyticsFilters, propertyWhere: Prisma.PropertyWhereInput) {
  const createdAt = dateRange(filters.startDate, filters.endDate);
  const ownerIds = [...filters.sellerIds, ...filters.developerIds];
  const clauses: Prisma.ListingWhereInput[] = [];
  if (createdAt) clauses.push({ createdAt });
  if (filters.listingStatuses.length) clauses.push({ status: { in: filters.listingStatuses } });
  if (Object.keys(propertyWhere).length) clauses.push({ property: { is: propertyWhere } });
  if (ownerIds.length) clauses.push({ userId: { in: ownerIds } });
  const ownerTypeClauses: Prisma.ListingWhereInput[] = [];
  if (filters.userTypes.includes("SELLER")) ownerTypeClauses.push({ user: { role: "SELLER", isCompanyAccount: false } });
  if (filters.userTypes.includes("DEVELOPER")) ownerTypeClauses.push({ user: { role: "SELLER", isCompanyAccount: true } });
  if (ownerTypeClauses.length) clauses.push({ OR: ownerTypeClauses });
  return clauses.length ? { AND: clauses } : {};
}

function buildSoldListingWhere(filters: AnalyticsFilters, soldPropertyWhere: Prisma.PropertyWhereInput) {
  const soldAtRange = dateRange(filters.startDate, filters.endDate);
  const soldAt: Prisma.DateTimeNullableFilter = { not: null };
  if (soldAtRange?.gte) soldAt.gte = soldAtRange.gte;
  if (soldAtRange?.lte) soldAt.lte = soldAtRange.lte;

  const clauses: Prisma.ListingWhereInput[] = [{ soldAt }];
  if (filters.listingStatuses.length) clauses.push({ status: { in: filters.listingStatuses } });
  if (Object.keys(soldPropertyWhere).length) clauses.push({ property: { is: soldPropertyWhere } });

  const ownerClauses: Prisma.ListingWhereInput[] = [];
  if (filters.sellerIds.length) ownerClauses.push({ userId: { in: filters.sellerIds } });
  if (filters.developerIds.length) {
    ownerClauses.push({ userId: { in: filters.developerIds } });
    ownerClauses.push({ user: { companyOwnerId: { in: filters.developerIds } } });
  }
  if (ownerClauses.length) clauses.push({ OR: ownerClauses });

  const ownerTypeClauses: Prisma.ListingWhereInput[] = [];
  if (filters.userTypes.includes("SELLER")) ownerTypeClauses.push({ user: { role: "SELLER", isCompanyAccount: false } });
  if (filters.userTypes.includes("DEVELOPER")) ownerTypeClauses.push({ user: { role: "SELLER", isCompanyAccount: true } });
  if (ownerTypeClauses.length) clauses.push({ OR: ownerTypeClauses });

  return { AND: clauses };
}

function buildUserWhere(filters: AnalyticsFilters) {
  const createdAt = dateRange(filters.startDate, filters.endDate);
  const idFilters = [...filters.sellerIds, ...filters.developerIds, ...filters.buyerIds];
  const clauses: Prisma.UserWhereInput[] = [];
  if (createdAt) clauses.push({ createdAt });
  if (idFilters.length) clauses.push({ id: { in: idFilters } });
  const roleClauses: Prisma.UserWhereInput[] = [];
  if (filters.userTypes.includes("BUYER")) roleClauses.push({ role: "BUYER" });
  if (filters.userTypes.includes("SELLER")) roleClauses.push({ role: "SELLER", isCompanyAccount: false });
  if (filters.userTypes.includes("DEVELOPER")) roleClauses.push({ role: "SELLER", isCompanyAccount: true });
  if (filters.userTypes.includes("ADMIN")) roleClauses.push({ role: "ADMIN" });
  if (roleClauses.length) clauses.push({ OR: roleClauses });
  return clauses.length ? { AND: clauses } : {};
}

function buildPriceEstimateWhere(filters: AnalyticsFilters) {
  const createdAt = dateRange(filters.startDate, filters.endDate);
  const cities = selectedCities(filters);
  const clauses: Prisma.PriceEstimateWhereInput[] = [];
  if (createdAt) clauses.push({ createdAt });
  if (cities.length) clauses.push({ city: { in: cities } });
  if (filters.propertyTypes.length) clauses.push({ propertyType: { in: filters.propertyTypes } });
  if (filters.minAiPrice != null || filters.maxAiPrice != null) {
    const range: Prisma.FloatFilter = {};
    if (filters.minAiPrice != null) range.gte = filters.minAiPrice;
    if (filters.maxAiPrice != null) range.lte = filters.maxAiPrice;
    clauses.push({ estimatedPrice: range });
  }
  return clauses.length ? { AND: clauses } : {};
}

function buildEventWhere(filters: AnalyticsFilters, eventType?: AnalyticsEventType) {
  const createdAt = dateRange(filters.startDate, filters.endDate);
  const where: Prisma.AnalyticsEventWhereInput = {};
  if (createdAt) where.createdAt = createdAt;
  if (eventType) where.eventType = eventType;
  return where;
}

function chartPropertyWhere(filters: AnalyticsFilters, propertyWhere: Prisma.PropertyWhereInput): Prisma.PropertyWhereInput {
  return {
    ...propertyWhere,
    listing: filters.listingStatuses.length ? { status: { in: filters.listingStatuses }, soldAt: null } : { status: "APPROVED", soldAt: null }
  };
}

function buildAppointmentWhere(filters: AnalyticsFilters, propertyWhere: Prisma.PropertyWhereInput): Prisma.AppointmentWhereInput {
  const createdAt = dateRange(filters.startDate, filters.endDate);
  const clauses: Prisma.AppointmentWhereInput[] = [];
  if (createdAt) clauses.push({ createdAt });
  if (filters.buyerIds.length) clauses.push({ userId: { in: filters.buyerIds } });
  if (Object.keys(propertyWhere).length || filters.listingStatuses.length) clauses.push({ property: chartPropertyWhere(filters, propertyWhere) });
  return clauses.length ? { AND: clauses } : {};
}

function buildFavoriteWhere(filters: AnalyticsFilters, propertyWhere: Prisma.PropertyWhereInput): Prisma.FavoriteWhereInput {
  const createdAt = dateRange(filters.startDate, filters.endDate);
  const clauses: Prisma.FavoriteWhereInput[] = [];
  if (createdAt) clauses.push({ createdAt });
  if (filters.buyerIds.length) clauses.push({ userId: { in: filters.buyerIds } });
  if (Object.keys(propertyWhere).length || filters.listingStatuses.length) clauses.push({ property: chartPropertyWhere(filters, propertyWhere) });
  return clauses.length ? { AND: clauses } : {};
}

function buildPropertyViewWhere(filters: AnalyticsFilters, propertyWhere: Prisma.PropertyWhereInput): Prisma.PropertyViewWhereInput {
  const createdAt = dateRange(filters.startDate, filters.endDate);
  const clauses: Prisma.PropertyViewWhereInput[] = [];
  if (createdAt) clauses.push({ createdAt });
  if (Object.keys(propertyWhere).length || filters.listingStatuses.length) clauses.push({ property: chartPropertyWhere(filters, propertyWhere) });
  return clauses.length ? { AND: clauses } : {};
}

function countBy<T>(items: T[], keyFn: (item: T) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item)?.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return toCountData(counts);
}

function toCountData(map: Map<string, number>) {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function averageBy<T>(items: T[], keyFn: (item: T) => string | null | undefined, valueFn: (item: T) => number | null | undefined) {
  const groups = new Map<string, { sum: number; count: number }>();
  for (const item of items) {
    const key = keyFn(item)?.trim();
    const value = valueFn(item);
    if (!key || value == null || !Number.isFinite(value)) continue;
    const group = groups.get(key) ?? { sum: 0, count: 0 };
    group.sum += value;
    group.count += 1;
    groups.set(key, group);
  }
  return Array.from(groups.entries())
    .map(([label, group]) => ({ label, value: Math.round(group.sum / Math.max(group.count, 1)) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function yearKey(date: Date) {
  return String(date.getUTCFullYear());
}

function dayKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function weekKey(date: Date) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 1 - day);
  return dayKey(copy);
}

function trendBy<T>(items: T[], dateFn: (item: T) => Date, bucket: "day" | "week" | "month" | "year", limit = 18) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const date = dateFn(item);
    const key = bucket === "day" ? dayKey(date) : bucket === "week" ? weekKey(date) : bucket === "year" ? yearKey(date) : monthKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([label, count]) => ({ label, count }));
}

function valueTrendBy<T>(items: T[], dateFn: (item: T) => Date, valueFn: (item: T) => number | null | undefined, bucket: "month" | "year", limit = 18) {
  const totals = new Map<string, number>();
  for (const item of items) {
    const value = valueFn(item);
    if (value == null || !Number.isFinite(value)) continue;
    const date = dateFn(item);
    const key = bucket === "year" ? yearKey(date) : monthKey(date);
    totals.set(key, (totals.get(key) ?? 0) + value);
  }
  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([label, value]) => ({ label, value: Math.round(value) }));
}

function averageByAscending<T>(items: T[], keyFn: (item: T) => string | null | undefined, valueFn: (item: T) => number | null | undefined) {
  const groups = new Map<string, { sum: number; count: number }>();
  for (const item of items) {
    const key = keyFn(item)?.trim();
    const value = valueFn(item);
    if (!key || value == null || !Number.isFinite(value)) continue;
    const group = groups.get(key) ?? { sum: 0, count: 0 };
    group.sum += value;
    group.count += 1;
    groups.set(key, group);
  }
  return Array.from(groups.entries())
    .map(([label, group]) => ({ label, value: Math.round(group.sum / Math.max(group.count, 1)) }))
    .sort((a, b) => a.value - b.value || a.label.localeCompare(b.label));
}

function cumulativeTrend(points: TrendDatum[]) {
  let running = 0;
  return points.map((point) => {
    running += point.count;
    return { label: point.label, count: running };
  });
}

function stackedListingsByMonth(listings: Array<{ status: ListingStatus; createdAt: Date }>) {
  const buckets = new Map<string, Record<string, number>>();
  for (const listing of listings) {
    const key = monthKey(listing.createdAt);
    const values = buckets.get(key) ?? Object.fromEntries(LISTING_STATUSES.map((status) => [status, 0]));
    values[listing.status] = (values[listing.status] ?? 0) + 1;
    buckets.set(key, values);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([label, values]) => ({ label, values }));
}

function activityHeatmap(events: Array<{ createdAt: Date }>) {
  const counts = new Map<string, number>();
  for (const event of events) {
    const day = event.createdAt.getUTCDay();
    const hour = event.createdAt.getUTCHours();
    const key = `${day}:${hour}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from({ length: 7 * 24 }, (_, index) => {
    const day = Math.floor(index / 24);
    const hour = index % 24;
    return { day, hour, count: counts.get(`${day}:${hour}`) ?? 0 };
  });
}

function statusCounts(rows: Array<{ status: ListingStatus }>) {
  return LISTING_STATUSES.map((status) => ({
    label: status,
    count: rows.filter((row) => row.status === status).length
  }));
}

function userType(user: { role: Role; isCompanyAccount: boolean }) {
  if (user.role === "SELLER" && user.isCompanyAccount) return "DEVELOPER";
  return user.role;
}

function searchMetadata(event: { metadata: Prisma.JsonValue | null }) {
  const metadata = event.metadata as { filters?: Record<string, unknown> } | null;
  return metadata?.filters ?? {};
}

function filterSearchEvents(
  events: Array<{ metadata: Prisma.JsonValue | null; createdAt: Date }>,
  filters: AnalyticsFilters
) {
  const cities = new Set(selectedCities(filters).map((value) => value.toLowerCase()));
  const propertyTypes = new Set(filters.propertyTypes.map((value) => value.toLowerCase()));
  const transactionTypes = new Set(filters.transactionTypes.map((value) => value.toLowerCase()));
  return events.filter((event) => {
    const metadata = searchMetadata(event);
    const city = String(metadata.city ?? "").toLowerCase();
    const type = String(metadata.type ?? metadata.propertyType ?? "").toLowerCase();
    const transaction = String(metadata.transaction ?? "").toLowerCase();
    if (cities.size && (!city || !cities.has(city))) return false;
    if (propertyTypes.size && (!type || !propertyTypes.has(type))) return false;
    if (transactionTypes.size && (!transaction || !transactionTypes.has(transaction))) return false;
    return true;
  });
}

async function hydratePropertyCounts(rows: Array<{ propertyId: string; _count: { _all: number } }>) {
  if (rows.length === 0) return [];
  const properties = await prisma.property.findMany({
    where: { id: { in: rows.map((row) => row.propertyId) }, listing: { status: "APPROVED", soldAt: null } },
    select: {
      id: true,
      title: true,
      titleEn: true,
      titleAr: true,
      city: true,
      area: true,
      price: true,
      rentPrice: true,
      currency: true
    }
  });
  const byId = new Map(properties.map((property) => [property.id, property]));
  return rows
    .map((row) => {
      const property = byId.get(row.propertyId);
      return property
        ? {
            propertyId: row.propertyId,
            title: property.title,
            titleEn: property.titleEn,
            titleAr: property.titleAr,
            city: property.city,
            area: property.area,
            price: propertyPrice(property),
            currency: property.currency,
            count: row._count._all
          }
        : null;
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

async function getFilterOptions(): Promise<AnalyticsDashboard["filterOptions"]> {
  const now = Date.now();
  if (filterOptionsCache && filterOptionsCache.expiresAt > now) return filterOptionsCache.value;

  const [cityRows, users, propertyPrices, aiPriceRange] = await Promise.all([
    prisma.property.findMany({
      distinct: ["city"],
      orderBy: { city: "asc" },
      select: { city: true }
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, isCompanyAccount: true }
    }),
    prisma.property.findMany({ select: { price: true, rentPrice: true } }),
    prisma.priceEstimate.aggregate({ _min: { estimatedPrice: true }, _max: { estimatedPrice: true } })
  ]);

  const cities = cityRows.map((row) => row.city).filter(Boolean);
  const governorates = Array.from(new Set(cities.map(cityToGovernorate))).sort((a, b) => a.localeCompare(b));
  const prices = propertyPrices.map(propertyPrice).filter((value): value is number => value != null);
  const value = {
    cities: cities.map((city) => ({ value: city, label: city })),
    governorates: governorates.map((governorate) => ({ value: governorate, label: governorate })),
    propertyTypes: PROPERTY_TYPES.map((type) => ({ value: type, label: type })),
    transactionTypes: TRANSACTION_TYPES.map((type) => ({ value: type, label: type })),
    listingStatuses: LISTING_STATUSES.map((status) => ({ value: status, label: status })),
    sellers: users
      .filter((user) => user.role === "SELLER" && !user.isCompanyAccount)
      .map((user) => ({ value: user.id, label: `${user.name} (${user.email})` })),
    developers: users
      .filter((user) => user.role === "SELLER" && user.isCompanyAccount)
      .map((user) => ({ value: user.id, label: `${user.name} (${user.email})` })),
    buyers: users
      .filter((user) => user.role === "BUYER")
      .map((user) => ({ value: user.id, label: `${user.name} (${user.email})` })),
    userTypes: USER_TYPES.map((type) => ({ value: type, label: type })),
    priceRange: {
      min: prices.length ? Math.min(...prices) : null,
      max: prices.length ? Math.max(...prices) : null
    },
    aiPriceRange: {
      min: aiPriceRange._min.estimatedPrice == null ? null : Math.floor(aiPriceRange._min.estimatedPrice),
      max: aiPriceRange._max.estimatedPrice == null ? null : Math.ceil(aiPriceRange._max.estimatedPrice)
    }
  };
  filterOptionsCache = { expiresAt: now + FILTER_OPTIONS_TTL_MS, value };
  return value;
}

export async function getAdminAnalyticsDashboard(input?: AnalyticsFilterInput | AnalyticsFilters): Promise<AnalyticsDashboard> {
  const filters = Array.isArray((input as AnalyticsFilters | undefined)?.cities)
    ? (input as AnalyticsFilters)
    : normalizeAnalyticsFilters(input as AnalyticsFilterInput | undefined);
  const propertyWhere = buildPropertyWhere(filters);
  const soldPropertyWhere = buildPropertyWhere(filters, { includeCreatedAt: false });
  const listingWhere = buildListingWhere(filters, propertyWhere);
  const soldListingWhere = buildSoldListingWhere(filters, soldPropertyWhere);
  const userWhere = buildUserWhere(filters);
  const priceEstimateWhere = buildPriceEstimateWhere(filters);
  const eventWhere = buildEventWhere(filters);
  const searchEventWhere = buildEventWhere(filters, "SEARCH");
  const appointmentWhere = buildAppointmentWhere(filters, propertyWhere);
  const favoriteWhere = buildFavoriteWhere(filters, propertyWhere);
  const propertyViewWhere = buildPropertyViewWhere(filters, propertyWhere);

  const [
    filterOptions,
    listings,
    users,
    priceEstimates,
    events,
    searchEventsRaw,
    appointments,
    favorites,
    soldListings,
    topViewedRows,
    topFavoritedRows,
    newestUsers,
    newestProperties
  ] = await Promise.all([
    getFilterOptions(),
    prisma.listing.findMany({
      where: listingWhere,
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        reviewedAt: true,
        soldAt: true,
        userId: true,
        user: { select: { id: true, name: true, role: true, isCompanyAccount: true } },
        property: {
          select: {
            id: true,
            title: true,
            titleEn: true,
            titleAr: true,
            city: true,
            area: true,
            district: true,
            type: true,
            transaction: true,
            price: true,
            rentPrice: true,
            currency: true,
            areaSqm: true,
            createdAt: true
          }
        }
      }
    }),
    prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, email: true, role: true, isCompanyAccount: true, blocked: true, createdAt: true }
    }),
    prisma.priceEstimate.findMany({
      where: priceEstimateWhere,
      select: { id: true, city: true, area: true, district: true, propertyType: true, estimatedPrice: true, createdAt: true }
    }),
    prisma.analyticsEvent.findMany({
      where: eventWhere,
      select: { eventType: true, metadata: true, createdAt: true }
    }),
    prisma.analyticsEvent.findMany({
      where: searchEventWhere,
      select: { eventType: true, metadata: true, createdAt: true }
    }),
    prisma.appointment.findMany({ where: appointmentWhere, select: { id: true, status: true, createdAt: true, propertyId: true, userId: true } }),
    prisma.favorite.findMany({ where: favoriteWhere, select: { id: true, createdAt: true, propertyId: true, userId: true } }),
    prisma.listing.findMany({
      where: soldListingWhere,
      select: {
        id: true,
        createdAt: true,
        soldAt: true,
        soldSnapshot: true,
        user: {
          select: {
            id: true,
            name: true,
            isCompanyAccount: true,
            companyOwner: { select: { id: true, name: true } }
          }
        },
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            type: true,
            transaction: true,
            price: true,
            rentPrice: true,
            currency: true,
            createdAt: true
          }
        }
      }
    }),
    prisma.propertyView.groupBy({ by: ["propertyId"], where: propertyViewWhere, _count: { _all: true }, orderBy: { _count: { propertyId: "desc" } }, take: 8 }),
    prisma.favorite.groupBy({ by: ["propertyId"], where: favoriteWhere, _count: { _all: true }, orderBy: { _count: { propertyId: "desc" } }, take: 8 }),
    prisma.user.findMany({
      where: userWhere,
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, role: true, isCompanyAccount: true, createdAt: true }
    }),
    prisma.property.findMany({
      where: chartPropertyWhere(filters, propertyWhere),
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        titleEn: true,
        titleAr: true,
        city: true,
        area: true,
        price: true,
        rentPrice: true,
        currency: true,
        createdAt: true,
        listing: { select: { status: true } }
      }
    })
  ]);

  const propertyListings = listings.filter((listing) => Boolean(listing.property));
  const chartListings = propertyListings.filter((listing) =>
    (filters.listingStatuses.length ? filters.listingStatuses.includes(listing.status) : listing.status === "APPROVED") && !listing.soldAt
  );
  const chartProperties = chartListings.map((listing) => listing.property!).filter(Boolean);
  const propertyPrices = chartProperties.map(propertyPrice).filter((value): value is number => value != null);
  const searchEvents = filterSearchEvents(searchEventsRaw, filters);
  const soldProperties = soldListings.flatMap((listing) => {
    if (!listing.soldAt || !listing.property) return [];
    const developer = listing.user.isCompanyAccount ? listing.user : listing.user.companyOwner;
    const price = propertyPrice(listing.property);
    return [
      {
        listingId: listing.id,
        propertyId: listing.property.id,
        title: listing.property.title,
        city: listing.property.city,
        governorate: cityToGovernorate(listing.property.city),
        type: listing.property.type,
        transaction: listing.property.transaction,
        price,
        currency: listing.property.currency,
        sellerId: listing.user.id,
        sellerName: listing.user.name,
        developerId: developer?.id ?? null,
        developerName: developer?.name ?? "Independent Sellers",
        soldAt: listing.soldAt,
        createdAt: listing.property.createdAt,
        daysActiveBeforeSale: daysBetween(listing.createdAt, listing.soldAt)
      }
    ];
  });
  const soldPrices = soldProperties.map((property) => property.price).filter((value): value is number => value != null);
  const soldDays = soldProperties.map((property) => property.daysActiveBeforeSale).filter((value) => Number.isFinite(value));

  const approvedListings = propertyListings.filter((listing) => listing.status === "APPROVED").length;
  const pendingListings = propertyListings.filter((listing) => listing.status === "PENDING").length;
  const rejectedListings = propertyListings.filter((listing) => listing.status === "REJECTED").length;
  const totalListings = propertyListings.length;
  const totalProperties = chartProperties.length;
  const totalSoldProperties = soldProperties.length;
  const totalSoldRevenueValue = soldPrices.reduce((sum, value) => sum + value, 0);
  const totalBuyers = users.filter((user) => user.role === "BUYER").length;
  const totalDevelopers = users.filter((user) => user.role === "SELLER" && user.isCompanyAccount).length;
  const totalSellers = users.filter((user) => user.role === "SELLER" && !user.isCompanyAccount).length;
  const denominator = approvedListings + pendingListings + rejectedListings;

  const [mostViewedProperties, mostFavoritedProperties] = await Promise.all([
    hydratePropertyCounts(topViewedRows),
    hydratePropertyCounts(topFavoritedRows)
  ]);

  const listingStatusCounts = statusCounts(propertyListings);
  const systemActivity = countBy(events, (event) => event.eventType);
  const searchCities = countBy(searchEvents, (event) => String(searchMetadata(event).city ?? ""));
  const searchTypes = countBy(searchEvents, (event) => String(searchMetadata(event).type ?? searchMetadata(event).propertyType ?? ""));
  const aiPrices = priceEstimates.map((estimate) => estimate.estimatedPrice).filter((value) => Number.isFinite(value));

  return {
    filters,
    filterOptions,
    totals: {
      totalUsers: users.length,
      totalBuyers,
      totalSellers,
      totalDevelopers,
      activeUsers: users.filter((user) => !user.blocked).length,
      inactiveUsers: users.filter((user) => user.blocked).length,
      totalProperties,
      totalListings,
      pendingListings,
      approvedListings,
      rejectedListings,
      totalAppointments: appointments.length,
      totalFavorites: favorites.length,
      totalPriceEstimates: priceEstimates.length,
      totalSearches: searchEvents.length,
      approvalRate: denominator ? Math.round((approvedListings / denominator) * 1000) / 10 : 0,
      rejectionRate: denominator ? Math.round((rejectedListings / denominator) * 1000) / 10 : 0,
      averagePropertyPrice: propertyPrices.length ? Math.round(propertyPrices.reduce((sum, value) => sum + value, 0) / propertyPrices.length) : null,
      averageAiPredictedPrice: aiPrices.length ? Math.round(aiPrices.reduce((sum, value) => sum + value, 0) / aiPrices.length) : null,
      totalSoldProperties,
      averageDaysUntilSale: soldDays.length ? Math.round(soldDays.reduce((sum, value) => sum + value, 0) / soldDays.length) : null,
      totalSoldRevenueValue: Math.round(totalSoldRevenueValue)
    },
    charts: {
      propertiesByCity: countBy(chartProperties, (property) => property.city),
      propertiesByGovernorate: countBy(chartProperties, (property) => cityToGovernorate(property.city)),
      propertiesByType: countBy(chartProperties, (property) => property.type),
      propertiesByTransaction: countBy(chartProperties, (property) => property.transaction),
      listingsByStatus: listingStatusCounts,
      topCitiesByListings: countBy(chartProperties, (property) => property.city).slice(0, 10),
      topPropertyTypes: countBy(chartProperties, (property) => property.type).slice(0, 8),
      averagePriceByCity: averageBy(chartProperties, (property) => property.city, propertyPrice).slice(0, 10),
      averagePriceByPropertyType: averageBy(chartProperties, (property) => property.type, propertyPrice),
      userRoleMix: countBy(users, userType),
      activeVsInactiveUsers: [
        { label: "ACTIVE", count: users.filter((user) => !user.blocked).length },
        { label: "INACTIVE", count: users.filter((user) => user.blocked).length }
      ],
      userRegistrationSources: [{ label: "DIRECT_OR_UNKNOWN", count: users.length }],
      newUsersPerMonth: trendBy(users, (user) => user.createdAt, "month", 12),
      userGrowthTrend: cumulativeTrend(trendBy(users, (user) => user.createdAt, "month", 18)),
      listingsCreatedPerMonth: trendBy(propertyListings, (listing) => listing.createdAt, "month", 12),
      listingStatusPerMonth: stackedListingsByMonth(propertyListings),
      dailyActivityTrend: trendBy(events, (event) => event.createdAt, "day", 30),
      weeklyActivityTrend: trendBy(events, (event) => event.createdAt, "week", 16),
      monthlyActivityTrend: trendBy(events, (event) => event.createdAt, "month", 12),
      totalPropertiesGrowth: cumulativeTrend(trendBy(chartProperties, (property) => property.createdAt, "month", 18)),
      totalUsersGrowth: cumulativeTrend(trendBy(users, (user) => user.createdAt, "month", 18)),
      aiPredictionsPerDay: trendBy(priceEstimates, (estimate) => estimate.createdAt, "day", 30),
      aiPredictionsPerMonth: trendBy(priceEstimates, (estimate) => estimate.createdAt, "month", 12),
      averagePredictedPriceByCity: averageBy(priceEstimates, (estimate) => estimate.city, (estimate) => estimate.estimatedPrice).slice(0, 10),
      averagePredictedPriceByPropertyType: averageBy(priceEstimates, (estimate) => estimate.propertyType, (estimate) => estimate.estimatedPrice),
      highestPredictedPriceAreas: averageBy(
        priceEstimates,
        (estimate) => estimate.area ?? estimate.district ?? estimate.city,
        (estimate) => estimate.estimatedPrice
      ).slice(0, 10),
      aiUsageTrend: trendBy(priceEstimates, (estimate) => estimate.createdAt, "month", 12),
      mostSearchedCities: searchCities.slice(0, 10),
      mostSearchedPropertyTypes: searchTypes.slice(0, 8),
      searchActivityTrend: trendBy(searchEvents, (event) => event.createdAt, "month", 12),
      searchRequestsPerDay: trendBy(searchEvents, (event) => event.createdAt, "day", 30),
      listingConversionFunnel: [
        { label: "LISTINGS_CREATED", count: totalListings },
        { label: "PENDING", count: pendingListings },
        { label: "APPROVED", count: approvedListings },
        { label: "REJECTED", count: rejectedListings }
      ],
      systemActivityOverview: systemActivity,
      propertyPriceScatter: chartProperties
        .map((property) => ({
          label: property.title,
          x: property.areaSqm,
          y: propertyPrice(property) ?? 0,
          city: property.city,
          type: property.type
        }))
        .filter((point) => point.x > 0 && point.y > 0)
        .slice(0, 160),
      activityHeatmap: activityHeatmap(events),
      soldPropertiesByCity: countBy(soldProperties, (property) => property.city),
      soldPropertiesByGovernorate: countBy(soldProperties, (property) => property.governorate),
      soldPropertiesByType: countBy(soldProperties, (property) => property.type),
      soldPropertiesByDeveloper: countBy(soldProperties, (property) => property.developerName),
      soldPropertiesBySeller: countBy(soldProperties, (property) => property.sellerName),
      soldPropertiesPerMonth: trendBy(soldProperties, (property) => property.soldAt, "month", 12),
      soldPropertiesPerYear: trendBy(soldProperties, (property) => property.soldAt, "year", 8),
      fastestSellingPropertyTypes: averageByAscending(soldProperties, (property) => property.type, (property) => property.daysActiveBeforeSale).slice(0, 8),
      highestSellingCities: countBy(soldProperties, (property) => property.city).slice(0, 10),
      soldValueByMonth: valueTrendBy(soldProperties, (property) => property.soldAt, (property) => property.price, "month", 12)
    },
    tables: {
      mostViewedProperties,
      mostFavoritedProperties,
      newestUsers: newestUsers.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString()
      })),
      newestProperties: newestProperties.map((property) => ({
        id: property.id,
        title: property.title,
        titleEn: property.titleEn,
        titleAr: property.titleAr,
        city: property.city,
        area: property.area,
        price: propertyPrice(property),
        currency: property.currency,
        status: property.listing.status,
        createdAt: property.createdAt.toISOString()
      }))
    },
    generatedAt: new Date().toISOString()
  };
}

import { clsx, type ClassValue } from "clsx";
import type { SearchFilters } from "./types.ts";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function isValidPhoneNumber(phone: string) {
  return /^01\d{9}$/.test(phone.trim());
}

export function formatPrice(value: number | null, currency = "EGP", language: "en" | "ar" = "en") {
  if (value === null) return "N/A";
  return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-EG", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export function parseArrayParam(v?: string | string[]) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v.split(",").map((x) => x.trim()).filter(Boolean);
}

export function toNum(v?: string | string[]) {
  const raw = Array.isArray(v) ? v[0] : v;
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function parseSearchParams(searchParams: Record<string, string | string[] | undefined>): SearchFilters {
  return {
    q: typeof searchParams.q === "string" ? searchParams.q : undefined,
    transaction: typeof searchParams.transaction === "string" ? (searchParams.transaction as SearchFilters["transaction"]) : undefined,
    type: parseArrayParam(searchParams.type) as SearchFilters["type"],
    city: typeof searchParams.city === "string" ? searchParams.city : undefined,
    area: typeof searchParams.area === "string" ? searchParams.area : undefined,
    district: typeof searchParams.district === "string" ? searchParams.district : undefined,
    minPrice: toNum(searchParams.minPrice),
    maxPrice: toNum(searchParams.maxPrice),
    minArea: toNum(searchParams.minArea),
    maxArea: toNum(searchParams.maxArea),
    minBeds: toNum(searchParams.minBeds),
    maxBeds: toNum(searchParams.maxBeds),
    minBaths: toNum(searchParams.minBaths),
    maxBaths: toNum(searchParams.maxBaths),
    paymentType: typeof searchParams.paymentType === "string" ? (searchParams.paymentType as SearchFilters["paymentType"]) : undefined,
    furnishing: typeof searchParams.furnishing === "string" ? (searchParams.furnishing as SearchFilters["furnishing"]) : undefined,
    completionStatus: typeof searchParams.completionStatus === "string" ? (searchParams.completionStatus as SearchFilters["completionStatus"]) : undefined,
    amenities: parseArrayParam(searchParams.amenities),
    lat: toNum(searchParams.lat),
    lng: toNum(searchParams.lng),
    distanceKm: toNum(searchParams.distanceKm),
    downPaymentMax: toNum(searchParams.downPaymentMax),
    installmentYearsMax: toNum(searchParams.installmentYearsMax),
    installmentMonthlyMax: toNum(searchParams.installmentMonthlyMax),
    page: toNum(searchParams.page) ?? 1,
    pageSize: toNum(searchParams.pageSize) ?? 20,
    sort: typeof searchParams.sort === "string" ? (searchParams.sort as SearchFilters["sort"]) : "FEATURED"
  };
}

export function toSearchParams(filters: SearchFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
      return;
    }
    params.set(key, String(value));
  });
  return params.toString();
}

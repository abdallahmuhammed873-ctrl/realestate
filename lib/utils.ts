import { clsx, type ClassValue } from "clsx";
export { parsePublicSearchFilters as parseSearchParams, toSearchParams } from "./search-contract.ts";

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

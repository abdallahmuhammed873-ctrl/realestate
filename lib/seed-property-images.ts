import { PROPERTY_IMAGE_FALLBACK } from "./property-images.ts";
import type { PropertyType, TransactionType } from "./types.ts";

const APARTMENT_IMAGES = [
  "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200",
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200"
];

const VILLA_IMAGES = [
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200",
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200"
];

const COMMERCIAL_IMAGES = [
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200",
  "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200"
];

const CHALET_IMAGES = [
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200",
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200"
];

const IMAGE_POOLS: Record<PropertyType, string[]> = {
  APARTMENT: APARTMENT_IMAGES,
  VILLA: VILLA_IMAGES,
  DUPLEX: VILLA_IMAGES,
  PENTHOUSE: APARTMENT_IMAGES,
  CHALET: CHALET_IMAGES,
  LAND: CHALET_IMAGES,
  COMMERCIAL: COMMERCIAL_IMAGES
};

function stableHash(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

export function getSeedPropertyImageUrl(input: {
  propertyId: string;
  propertyType: PropertyType;
  transaction: TransactionType;
  imageName?: string;
}) {
  const pool =
    input.transaction === "RENT" && input.propertyType === "APARTMENT"
      ? [APARTMENT_IMAGES[1]!, ...APARTMENT_IMAGES.filter((image) => image !== APARTMENT_IMAGES[1]!)]
      : IMAGE_POOLS[input.propertyType] ?? APARTMENT_IMAGES;
  const hash = stableHash(`${input.propertyId}:${input.imageName ?? "image_1.jpg"}`);
  return pool[hash % pool.length] ?? PROPERTY_IMAGE_FALLBACK;
}

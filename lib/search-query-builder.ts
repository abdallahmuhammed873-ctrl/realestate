import { Prisma } from "@prisma/client";
import type { SearchFilters } from "./types.ts";

export function buildPrismaPropertyWhere(filters: SearchFilters): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {
    listing: { status: "APPROVED" }
  };
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } }
    ];
  }
  if (filters.transaction) where.transaction = filters.transaction;
  if (filters.type?.length) where.type = { in: filters.type };
  if (filters.city) where.city = filters.city;
  if (filters.area) where.area = filters.area;
  if (filters.district) where.district = filters.district;
  if (filters.paymentType) where.paymentType = filters.paymentType;
  if (filters.furnishing) where.furnishing = filters.furnishing;
  if (filters.completionStatus) where.completionStatus = filters.completionStatus;
  if (filters.amenities?.length) where.amenities = { hasEvery: filters.amenities };
  if (filters.minArea !== undefined || filters.maxArea !== undefined) {
    where.areaSqm = { gte: filters.minArea, lte: filters.maxArea };
  }
  if (filters.minBeds !== undefined || filters.maxBeds !== undefined) {
    where.bedrooms = { gte: filters.minBeds, lte: filters.maxBeds };
  }
  if (filters.minBaths !== undefined || filters.maxBaths !== undefined) {
    where.bathrooms = { gte: filters.minBaths, lte: filters.maxBaths };
  }
  if (filters.transaction === "RENT") {
    where.rentPrice = { gte: filters.minPrice, lte: filters.maxPrice };
  } else if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = { gte: filters.minPrice, lte: filters.maxPrice };
  }
  return where;
}

import { Prisma } from "@prisma/client";
import type { SearchFilters } from "./types.ts";

export function buildPrismaPropertyWhere(filters: SearchFilters): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {
    listing: { status: "APPROVED" }
  };
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { projectName: { contains: filters.q, mode: "insensitive" } },
      { unitCode: { contains: filters.q, mode: "insensitive" } },
      { inventoryStatus: { contains: filters.q, mode: "insensitive" } },
      { address: { contains: filters.q, mode: "insensitive" } },
      { city: { contains: filters.q, mode: "insensitive" } },
      { area: { contains: filters.q, mode: "insensitive" } },
      { district: { contains: filters.q, mode: "insensitive" } }
    ];
  }
  if (filters.transaction) where.transaction = filters.transaction;
  if (filters.type?.length) where.type = { in: filters.type };
  if (filters.city) where.city = { contains: filters.city, mode: "insensitive" };
  if (filters.area) where.area = { contains: filters.area, mode: "insensitive" };
  if (filters.district) where.district = { contains: filters.district, mode: "insensitive" };
  if (filters.projectName) where.projectName = { contains: filters.projectName, mode: "insensitive" };
  if (filters.unitCode) where.unitCode = { contains: filters.unitCode, mode: "insensitive" };
  if (filters.inventoryStatus) where.inventoryStatus = { contains: filters.inventoryStatus, mode: "insensitive" };
  if (filters.paymentType) where.paymentType = filters.paymentType;
  if (filters.furnishing) where.furnishing = filters.furnishing;
  if (filters.completionStatus) where.completionStatus = filters.completionStatus;
  if (filters.hasGarden !== undefined) where.hasGarden = filters.hasGarden;
  if (filters.hasRoof !== undefined) where.hasRoof = filters.hasRoof;
  if (filters.has360View) {
    where.media = {
      some: {
        kind: { in: ["PANORAMA_360", "SPIN_360_FRAME"] }
      }
    };
  }
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

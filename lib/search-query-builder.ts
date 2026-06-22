import { Prisma } from "@prisma/client";
import type { SearchFilters } from "./types.ts";

function buildKeywordTermWhere(term: string): Prisma.PropertyWhereInput {
  return {
    OR: [
      { title: { contains: term, mode: "insensitive" } },
      { titleEn: { contains: term, mode: "insensitive" } },
      { titleAr: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { descriptionEn: { contains: term, mode: "insensitive" } },
      { descriptionAr: { contains: term, mode: "insensitive" } },
      { projectName: { contains: term, mode: "insensitive" } },
      { unitCode: { contains: term, mode: "insensitive" } },
      { inventoryStatus: { contains: term, mode: "insensitive" } },
      { address: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
      { area: { contains: term, mode: "insensitive" } },
      { district: { contains: term, mode: "insensitive" } },
      {
        listing: {
          user: {
            name: { contains: term, mode: "insensitive" }
          }
        }
      },
      {
        listing: {
          user: {
            companyOwner: {
              name: { contains: term, mode: "insensitive" }
            }
          }
        }
      }
    ]
  };
}

function parseKeywordTerms(query?: string) {
  if (!query) return [];
  return Array.from(new Set(query.split(/\s+/).map((term) => term.trim()).filter(Boolean))).slice(0, 8);
}

export function buildPrismaPropertyWhere(filters: SearchFilters): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {
    listing: { status: "APPROVED" }
  };
  const andClauses: Prisma.PropertyWhereInput[] = [];
  const keywordTerms = parseKeywordTerms(filters.q);
  if (keywordTerms.length > 0) andClauses.push(...keywordTerms.map(buildKeywordTermWhere));
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
  if (andClauses.length > 0) where.AND = andClauses;
  return where;
}

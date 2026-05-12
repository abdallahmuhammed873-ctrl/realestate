import type { SearchFilters } from "../types.ts";
import { mapProperty, searchPropertyCards, toPublicPropertyCard } from "../server/repository-helpers.ts";
import { prisma } from "../server/prisma.ts";

export async function searchProperties(filters: SearchFilters) {
  return searchPropertyCards(filters);
}

export async function getPublicPropertyById(id: string) {
  const property = await prisma.property.findFirst({
    where: {
      id,
      listing: { status: "APPROVED" }
    },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      listing: {
        include: {
          user: {
            include: {
              companyOwner: true
            }
          }
        }
      }
    }
  });
  return property ? toPublicPropertyCard(property) : null;
}

export async function getRecommendations(userId?: string, currentPropertyId?: string) {
  const source = (await searchPropertyCards({ page: 1, pageSize: 200 })).items;
  const favorites = userId
    ? await prisma.favorite.findMany({
        where: { userId },
        select: { propertyId: true }
      })
    : [];
  const favoriteIds = new Set(favorites.map((favorite) => favorite.propertyId));
  const favoriteProperties = source.filter((property) => favoriteIds.has(property.id));
  const favoriteAreas = new Set(favoriteProperties.map((property) => property.area));
  const favoriteTypes = new Set(favoriteProperties.map((property) => property.type));
  const current = currentPropertyId ? source.find((property) => property.id === currentPropertyId) : null;

  return source
    .filter((property) => property.id !== currentPropertyId)
    .map((property) => {
      let score = 0;
      if (favoriteAreas.has(property.area)) score += 2;
      if (favoriteTypes.has(property.type)) score += 2;
      if (current && current.area === property.area) score += 3;
      if (current && current.type === property.type) score += 1;
      if (property.goodDeal) score += 1;
      return { ...property, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export async function listFavorites(userId: string) {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      property: {
        include: {
          media: { orderBy: { sortOrder: "asc" } },
          listing: {
            include: {
              user: {
                include: {
                  companyOwner: true
                }
              }
            }
          }
        }
      }
    }
  });

  return favorites
    .filter((favorite) => favorite.property.listing.status === "APPROVED")
    .map((favorite) => toPublicPropertyCard(favorite.property));
}

export async function toggleFavorite(userId: string, propertyId: string) {
  const existing = await prisma.favorite.findFirst({
    where: { userId, propertyId }
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return { saved: false };
  }
  await prisma.favorite.create({
    data: {
      userId,
      propertyId
    }
  });
  return { saved: true };
}

export async function getPropertyForSeller(id: string, sellerId: string) {
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      listing: true
    }
  });
  if (!property || property.listing.userId !== sellerId) return null;
  return { property: mapProperty(property)!, listing: property.listing };
}

import type { ListingStatus, Property } from "../types.ts";
import {
  canSellerAccessListing,
  getSellerDashboardScopeIds,
  mapListing,
  mapProperty,
  mapUser,
  toPublicPropertyCard
} from "../server/repository-helpers.ts";
import { deleteUploadedFile, isLocalUploadPath, promotePropertyImages } from "../server/local-media.ts";
import { prisma } from "../server/prisma.ts";

export async function listSellerListingsForAdmin(sellerId: string) {
  const scopeIds = await getSellerDashboardScopeIds(sellerId);
  const listings = await prisma.listing.findMany({
    where: {
      userId: { in: scopeIds }
    },
    include: {
      property: {
        include: {
          media: { orderBy: { sortOrder: "asc" } }
        }
      },
      user: {
        include: {
          companyOwner: true
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return listings
    .filter((listing) => Boolean(listing.property))
    .map((listing) => ({
      listing: mapListing(listing)!,
      property: mapProperty(listing.property)!,
      seller: mapUser(listing.user),
      company: mapUser(listing.user.companyOwner)
    }));
}

export async function listSellerCommunityPostsForAdmin(sellerId: string) {
  const scopeIds = await getSellerDashboardScopeIds(sellerId);
  const posts = await prisma.communityPost.findMany({
    where: { userId: { in: scopeIds } },
    include: { user: true },
    orderBy: { createdAt: "desc" }
  });
  return posts.map((post) => ({
    post: {
      id: post.id,
      userId: post.userId,
      text: post.text,
      imageUrl: post.imagePath ?? null,
      imagePath: post.imagePath ?? null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    },
    author: mapUser(post.user)
  }));
}

async function listListingsByStatus(status: ListingStatus) {
  const listings = await prisma.listing.findMany({
    where: { status },
    include: {
      property: {
        include: {
          media: { orderBy: { sortOrder: "asc" } }
        }
      },
      user: {
        include: {
          companyOwner: true
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return listings.map((listing) => ({
    listing: mapListing(listing)!,
    property: mapProperty(listing.property)!,
    seller: mapUser(listing.user),
    company: mapUser(listing.user.companyOwner)
  }));
}

export async function listPendingListings() {
  const rows = await listListingsByStatus("PENDING");
  return rows.map((row) => row.listing);
}

export async function listPendingListingsDetailed() {
  return listListingsByStatus("PENDING");
}

export async function listApprovedListingsDetailed() {
  return listListingsByStatus("APPROVED");
}

export async function listRejectedListingsDetailed() {
  return listListingsByStatus("REJECTED");
}

export async function getListingWithProperty(listingId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      property: {
        include: {
          media: { orderBy: { sortOrder: "asc" } }
        }
      }
    }
  });
  if (!listing) return null;
  return {
    listing: mapListing(listing)!,
    property: mapProperty(listing.property)
  };
}

export async function updateListingStatus(
  listingId: string,
  status: Exclude<ListingStatus, "DRAFT" | "PENDING">,
  adminId: string,
  notes?: string
) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId }
  });
  if (!listing) return null;
  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      status,
      adminNotes: notes ?? null,
      reviewedBy: adminId,
      reviewedAt: new Date()
    }
  });
  return mapListing(updated);
}

type SellerListingInput = {
  listingId?: string;
  sellerId: string;
  feesPaid?: boolean;
  property: Omit<Property, "id" | "listingId" | "createdAt" | "updatedAt">;
};

function toPropertyCreateData(input: SellerListingInput["property"]) {
  return {
    title: input.title,
    description: input.description,
    projectName: input.projectName ?? null,
    unitCode: input.unitCode ?? null,
    inventoryStatus: input.inventoryStatus ?? null,
    transaction: input.transaction,
    type: input.type,
    price: input.price,
    rentPrice: input.rentPrice,
    currency: input.currency,
    pricePerSqm: input.pricePerSqm ?? null,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    areaSqm: input.areaSqm,
    landArea: input.landArea ?? null,
    gardenArea: input.gardenArea ?? null,
    roofArea: input.roofArea ?? null,
    hasGarden: Boolean(input.hasGarden),
    hasRoof: Boolean(input.hasRoof),
    lat: input.lat,
    lng: input.lng,
    address: input.address,
    city: input.city,
    area: input.area,
    district: input.district,
    furnishing: input.furnishing,
    paymentType: input.paymentType,
    completionStatus: input.completionStatus,
    amenities: input.amenities,
    images: [],
    installmentDownPayment: input.installmentDownPayment ?? null,
    installmentYears: input.installmentYears ?? null,
    installmentMonthly: input.installmentMonthly ?? null,
    sourceType: input.sourceType ?? "MANUAL",
    sourceFile: input.sourceFile ?? null,
    sourceSheet: input.sourceSheet ?? null
  };
}

async function syncPropertyImages(propertyId: string, nextPaths: string[], previousPaths: string[]) {
  const normalized = await promotePropertyImages(propertyId, nextPaths, previousPaths);

  await prisma.$transaction([
    prisma.property.update({
      where: { id: propertyId },
      data: {
        images: normalized.images
      }
    }),
    prisma.propertyMedia.deleteMany({
      where: { propertyId, kind: "IMAGE" }
    }),
    ...(normalized.media.length > 0
      ? [
          prisma.propertyMedia.createMany({
            data: normalized.media.map((item) => ({
              propertyId,
              kind: item.kind,
              path: item.path,
              sortOrder: item.sortOrder,
              mimeType: item.mimeType
            }))
          })
        ]
      : [])
  ]);
}

export async function createOrUpdateSellerListing(input: SellerListingInput) {
  if (input.listingId) {
    const listing = await prisma.listing.findUnique({
      where: { id: input.listingId },
      include: {
        property: {
          include: {
            media: { orderBy: { sortOrder: "asc" } }
          }
        }
      }
    });
    if (!listing || !listing.property) return null;
    const canAccess = await canSellerAccessListing(input.sellerId, listing.userId);
    if (!canAccess) return null;

    const updated = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        status: "PENDING",
        feesPaid: typeof input.feesPaid === "boolean" ? input.feesPaid : listing.feesPaid,
        property: {
          update: toPropertyCreateData(input.property)
        }
      },
      include: {
        property: {
          include: {
            media: { orderBy: { sortOrder: "asc" } }
          }
        }
      }
    });
    if (!updated.property) return null;

    await syncPropertyImages(
      updated.property.id,
      input.property.images,
      Array.from(new Set([...(listing.property.images ?? []), ...listing.property.media.map((item) => item.path)]))
    );

    const refreshed = await prisma.listing.findUnique({
      where: { id: updated.id },
      include: {
        property: {
          include: {
            media: { orderBy: { sortOrder: "asc" } }
          }
        }
      }
    });
    if (!refreshed?.property) return null;

    return {
      listing: mapListing(refreshed)!,
      property: mapProperty(refreshed.property)!
    };
  }

  const created = await prisma.listing.create({
    data: {
      userId: input.sellerId,
      status: "PENDING",
      feesPaid: Boolean(input.feesPaid),
      property: {
        create: toPropertyCreateData(input.property)
      }
    },
    include: {
      property: {
        include: {
          media: { orderBy: { sortOrder: "asc" } }
        }
      }
    }
  });
  if (!created.property) return null;

  await syncPropertyImages(created.property.id, input.property.images, []);

  const refreshed = await prisma.listing.findUnique({
    where: { id: created.id },
    include: {
      property: {
        include: {
          media: { orderBy: { sortOrder: "asc" } }
        }
      }
    }
  });
  if (!refreshed?.property) return null;

  return {
    listing: mapListing(refreshed)!,
    property: mapProperty(refreshed.property)!
  };
}

export async function deleteSellerListing(listingId: string, sellerId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      property: {
        include: {
          media: true
        }
      }
    }
  });
  if (!listing) return { ok: false as const, error: "Listing not found." };
  const canAccess = await canSellerAccessListing(sellerId, listing.userId);
  if (!canAccess) return { ok: false as const, error: "Listing not found." };

  const pathsToDelete = listing.property
    ? Array.from(new Set([...(listing.property.images ?? []), ...listing.property.media.map((item) => item.path)])).filter(isLocalUploadPath)
    : [];

  await prisma.listing.delete({
    where: { id: listing.id }
  });
  await Promise.all(pathsToDelete.map((filePath) => deleteUploadedFile(filePath)));
  return { ok: true as const };
}

export async function getSellerListingById(listingId: string, sellerId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      property: {
        include: {
          media: { orderBy: { sortOrder: "asc" } }
        }
      }
    }
  });
  if (!listing || !listing.property) return null;
  const canAccess = await canSellerAccessListing(sellerId, listing.userId);
  if (!canAccess) return null;
  return {
    listing: mapListing(listing)!,
    property: mapProperty(listing.property)!
  };
}

export async function listSellerDashboard(sellerId: string) {
  const visibleSellerIds = await getSellerDashboardScopeIds(sellerId);
  const listings = await prisma.listing.findMany({
    where: { userId: { in: visibleSellerIds } },
    include: {
      property: {
        include: {
          media: { orderBy: { sortOrder: "asc" } }
        }
      },
      user: true
    },
    orderBy: { updatedAt: "desc" }
  });

  const byStatus = listings.reduce<Record<ListingStatus, number>>(
    (acc, listing) => {
      acc[listing.status] += 1;
      return acc;
    },
    { DRAFT: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 }
  );

  return {
    listings: listings.map((listing) => mapListing(listing)!),
    byStatus,
    detailed: listings.map((listing) => ({
      listing: mapListing(listing)!,
      property: mapProperty(listing.property),
      seller: mapUser(listing.user)
    }))
  };
}

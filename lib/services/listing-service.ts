import type { ListingStatus, Property } from "../types.ts";
import {
  canSellerAccessListing,
  getSellerDashboardScopeIds,
  mapListing,
  mapProperty,
  mapUser,
  toPublicPropertyCard
} from "../server/repository-helpers.ts";
import { deleteUploadedFile, isLocalUploadPath, promotePropertyMedia, type PropertyMediaDraft } from "../server/local-media.ts";
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
    include: {
      user: true,
      _count: {
        select: {
          likes: true,
          comments: true
        }
      }
    },
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
      updatedAt: post.updatedAt.toISOString(),
      likesCount: post._count.likes,
      commentsCount: post._count.comments
    },
    author: mapUser(post.user)
  }));
}

export async function listSellerCommunityListingsForAdmin(sellerId: string) {
  const scopeIds = await getSellerDashboardScopeIds(sellerId);
  const listings = await prisma.listing.findMany({
    where: {
      userId: { in: scopeIds },
      status: "APPROVED"
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
      },
      _count: {
        select: {
          communityLikes: true,
          communityComments: true
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
      company: mapUser(listing.user.companyOwner),
      likesCount: listing._count.communityLikes,
      commentsCount: listing._count.communityComments
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
    titleEn: input.titleEn ?? null,
    titleAr: input.titleAr ?? null,
    description: input.description,
    descriptionEn: input.descriptionEn ?? null,
    descriptionAr: input.descriptionAr ?? null,
    projectName: input.projectName ?? null,
    unitCode: input.unitCode ?? null,
    inventoryStatus: null,
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
    // Seller-created and seller-edited listings always stay in the manual inventory lane.
    sourceType: "MANUAL" as const,
    sourceFile: null,
    sourceSheet: null
  };
}

function normalizePropertyMedia(property: SellerListingInput["property"]): PropertyMediaDraft[] {
  const candidateMedia =
    Array.isArray(property.media) && property.media.length > 0
      ? property.media
      : property.images.map((path, index) => ({
          id: `image-${index}`,
          propertyId: "draft-property",
          kind: "IMAGE" as const,
          path,
          label: null,
          altText: property.title,
          sortOrder: index,
          mimeType: null,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString()
        }));

  return candidateMedia
    .filter((item) => typeof item?.path === "string" && item.path.trim().length > 0)
    .map((item, index) => {
      const kind: PropertyMediaDraft["kind"] =
        item.kind === "PANORAMA_360" || item.kind === "SPIN_360_FRAME" ? item.kind : "IMAGE";

      return {
        kind,
        path: item.path.trim(),
        label: item.label ?? null,
        altText: item.altText ?? (kind === "PANORAMA_360" ? `${property.title} 360 view` : property.title),
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index,
        mimeType: item.mimeType ?? null
      };
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item, index) => ({
      ...item,
      sortOrder: index
    }));
}

async function syncPropertyMedia(propertyId: string, nextMedia: PropertyMediaDraft[], previousPaths: string[]) {
  const normalized = await promotePropertyMedia(propertyId, nextMedia, previousPaths);

  await prisma.$transaction([
    prisma.property.update({
      where: { id: propertyId },
      data: {
        images: normalized.images
      }
    }),
    prisma.propertyMedia.deleteMany({
      where: { propertyId }
    }),
    ...(normalized.media.length > 0
      ? [
          prisma.propertyMedia.createMany({
            data: normalized.media.map((item) => ({
              propertyId,
              kind: item.kind,
              path: item.path,
              label: item.label ?? null,
              altText: item.altText ?? null,
              sortOrder: item.sortOrder,
              mimeType: item.mimeType ?? null
            }))
          })
        ]
      : [])
  ]);
}

export async function createOrUpdateSellerListing(input: SellerListingInput) {
  const nextMedia = normalizePropertyMedia(input.property);

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

    await syncPropertyMedia(
      updated.property.id,
      nextMedia,
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

  await syncPropertyMedia(created.property.id, nextMedia, []);

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
  const listing = await findListingWithUploadedMedia(listingId);
  if (!listing) return { ok: false as const, error: "Listing not found." };
  const canAccess = await canSellerAccessListing(sellerId, listing.userId);
  if (!canAccess) return { ok: false as const, error: "Listing not found." };

  await deleteListingAndUploadedFiles(listing);
  return { ok: true as const };
}

async function findListingWithUploadedMedia(listingId: string) {
  return prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      property: {
        include: {
          media: true
        }
      }
    }
  });
}

type ListingWithUploadedMedia = NonNullable<Awaited<ReturnType<typeof findListingWithUploadedMedia>>>;

async function deleteListingAndUploadedFiles(listing: ListingWithUploadedMedia) {
  const pathsToDelete = listing.property
    ? Array.from(new Set([...(listing.property.images ?? []), ...listing.property.media.map((item) => item.path)])).filter(isLocalUploadPath)
    : [];

  await prisma.listing.delete({
    where: { id: listing.id }
  });
  await Promise.all(pathsToDelete.map((filePath) => deleteUploadedFile(filePath)));
}

export async function deleteCommunityListingForAdmin(listingId: string) {
  const listing = await findListingWithUploadedMedia(listingId);
  if (!listing || listing.status !== "APPROVED") {
    return { ok: false as const, error: "Community listing not found." };
  }

  await deleteListingAndUploadedFiles(listing);
  return { ok: true as const };
}

export async function deleteCommunityPostForAdmin(postId: string) {
  const post = await prisma.communityPost.findUnique({
    where: { id: postId }
  });
  if (!post) return { ok: false as const, error: "Community post not found." };

  await prisma.communityPost.delete({
    where: { id: post.id }
  });
  if (post.imagePath && isLocalUploadPath(post.imagePath)) {
    await deleteUploadedFile(post.imagePath);
  }

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

import { randomUUID } from "crypto";
import type {
  Appointment,
  CommunityListingComment,
  CommunityListingCommentLike,
  CommunityListingLike,
  CommunityPost,
  CommunityPostComment,
  CommunityPostCommentLike,
  CommunityPostLike,
  Favorite,
  Listing,
  ListingStatus,
  Property,
  PropertyMedia,
  PublicPropertyCard,
  SavedSearch,
  SearchFilters,
  SellerMessage,
  User
} from "../types.ts";
import { getPropertyCoverImage } from "../property-images.ts";
import { haversineDistanceKm, isValidPhoneNumber } from "../utils.ts";
import { buildPrismaPropertyWhere } from "../search-query-builder.ts";
import { prisma } from "./prisma.ts";
import {
  Appointment as PrismaAppointment,
  CommunityListingComment as PrismaCommunityListingComment,
  CommunityListingCommentLike as PrismaCommunityListingCommentLike,
  CommunityListingLike as PrismaCommunityListingLike,
  CommunityPost as PrismaCommunityPost,
  CommunityPostComment as PrismaCommunityPostComment,
  CommunityPostCommentLike as PrismaCommunityPostCommentLike,
  CommunityPostLike as PrismaCommunityPostLike,
  Favorite as PrismaFavorite,
  Listing as PrismaListing,
  Prisma,
  Property as PrismaProperty,
  PropertyMedia as PrismaPropertyMedia,
  SavedSearch as PrismaSavedSearch,
  SellerMessage as PrismaSellerMessage,
  User as PrismaUser
} from "@prisma/client";

type UserWithCompanyOwner = Prisma.UserGetPayload<{
  include: { companyOwner: true };
}>;

type PropertyWithCardRelations = Prisma.PropertyGetPayload<{
  include: {
    media: { orderBy: { sortOrder: "asc" } };
    listing: {
      include: {
        user: {
          include: {
            companyOwner: true;
          };
        };
      };
    };
  };
}>;

type ListingWithProperty = Prisma.ListingGetPayload<{
  include: {
    property: {
      include: {
        media: { orderBy: { sortOrder: "asc" } };
      };
    };
    user: {
      include: {
        companyOwner: true;
      };
    };
  };
}>;

type CommunityPostWithRelations = Prisma.CommunityPostGetPayload<{
  include: {
    user: {
      include: {
        companyOwner: true;
      };
    };
    likes: true;
    comments: {
      orderBy: { createdAt: "asc" };
      include: {
        user: true;
      };
    };
    commentLikes: true;
  };
}>;

type CommunityListingWithRelations = Prisma.ListingGetPayload<{
  include: {
    user: {
      include: {
        companyOwner: true;
      };
    };
    property: {
      include: {
        media: { orderBy: { sortOrder: "asc" } };
      };
    };
    communityLikes: true;
    communityComments: {
      orderBy: { createdAt: "asc" };
      include: {
        user: true;
      };
    };
    communityCommentLikes: true;
  };
}>;

type NotificationItem = {
  id: string;
  text: string;
  createdAt: string;
  href?: string;
};

type CommunityCommentView = {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string | null };
  canDelete: boolean;
  replies?: CommunityCommentView[];
  repliesCount?: number;
  likesCount?: number;
  likedByViewer?: boolean;
};

export type CommunityPostView = {
  id: string;
  text: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; avatarUrl?: string | null; isDeveloper: boolean; companyName?: string | null };
  likesCount: number;
  likeCount: number;
  loveCount: number;
  commentsCount: number;
  reactionByViewer: "LIKE" | "LOVE" | null;
  comments: CommunityCommentView[];
};

export type CommunityListingView = {
  listingId: string;
  propertyId: string;
  title: string;
  description: string;
  imageUrl?: string;
  city: string;
  area: string;
  district: string;
  transaction: Property["transaction"];
  createdAt: string;
  updatedAt: string;
  seller: { id: string; name: string; avatarUrl?: string | null; isDeveloper: boolean };
  likesCount: number;
  likedByViewer: boolean;
  commentsCount: number;
  comments: CommunityCommentView[];
};

const globalStore = globalThis as unknown as {
  notificationSeenByUser?: Record<string, string[]>;
  compareByUser?: Record<string, string[]>;
};

function ensureMemoryStore() {
  if (!globalStore.notificationSeenByUser) globalStore.notificationSeenByUser = {};
  if (!globalStore.compareByUser) globalStore.compareByUser = {};
  return globalStore;
}

export function getSeenNotificationIds(userId: string) {
  return ensureMemoryStore().notificationSeenByUser?.[userId] ?? [];
}

export function setSeenNotificationIds(userId: string, ids: string[]) {
  ensureMemoryStore().notificationSeenByUser![userId] = ids;
}

export function getCompareIdsMemory(userId: string) {
  return ensureMemoryStore().compareByUser?.[userId] ?? [];
}

export function setCompareIdsMemory(userId: string, ids: string[]) {
  ensureMemoryStore().compareByUser![userId] = ids.slice(0, 4);
  return ensureMemoryStore().compareByUser![userId];
}

export function toIso(date: Date | null | undefined) {
  return date ? date.toISOString() : null;
}

export function mapUser(user: PrismaUser | UserWithCompanyOwner | null): User | null {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    avatarUrl: user.avatarPath ?? null,
    avatarPath: user.avatarPath ?? null,
    role: user.role,
    isCompanyAccount: user.isCompanyAccount,
    companyOwnerId: user.companyOwnerId ?? undefined,
    password: user.password ?? undefined,
    blocked: user.blocked,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

export function mapListing(listing: PrismaListing | null): Listing | null {
  if (!listing) return null;
  return {
    id: listing.id,
    userId: listing.userId,
    status: listing.status,
    feesPaid: listing.feesPaid,
    adminNotes: listing.adminNotes ?? null,
    reviewedBy: listing.reviewedBy ?? null,
    reviewedAt: toIso(listing.reviewedAt),
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString()
  };
}

export function mapPropertyMedia(media: PrismaPropertyMedia): PropertyMedia {
  return {
    id: media.id,
    propertyId: media.propertyId,
    kind: media.kind,
    path: media.path,
    label: media.label ?? null,
    altText: media.altText ?? null,
    sortOrder: media.sortOrder,
    mimeType: media.mimeType ?? null,
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString()
  };
}

export function mapProperty(
  property:
    | (PrismaProperty & { media?: PrismaPropertyMedia[] })
    | PropertyWithCardRelations
    | null
): Property | null {
  if (!property) return null;
  const mediaImages =
    "media" in property && Array.isArray(property.media)
      ? property.media
          .filter((item) => item.kind === "IMAGE")
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => item.path)
      : [];
  return {
    id: property.id,
    listingId: property.listingId,
    title: property.title,
    titleEn: property.titleEn ?? null,
    titleAr: property.titleAr ?? null,
    description: property.description,
    descriptionEn: property.descriptionEn ?? null,
    descriptionAr: property.descriptionAr ?? null,
    projectName: property.projectName ?? null,
    unitCode: property.unitCode ?? null,
    inventoryStatus: property.inventoryStatus ?? null,
    transaction: property.transaction,
    type: property.type,
    price: property.price,
    rentPrice: property.rentPrice,
    currency: property.currency,
    pricePerSqm: property.pricePerSqm ?? null,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    areaSqm: property.areaSqm,
    landArea: property.landArea ?? null,
    gardenArea: property.gardenArea ?? null,
    roofArea: property.roofArea ?? null,
    hasGarden: property.hasGarden,
    hasRoof: property.hasRoof,
    lat: property.lat,
    lng: property.lng,
    address: property.address,
    city: property.city,
    area: property.area,
    district: property.district,
    furnishing: property.furnishing,
    paymentType: property.paymentType,
    completionStatus: property.completionStatus,
    amenities: property.amenities,
    images: mediaImages.length > 0 ? mediaImages : property.images,
    media: "media" in property && Array.isArray(property.media) ? property.media.map(mapPropertyMedia) : undefined,
    installmentDownPayment: property.installmentDownPayment ?? null,
    installmentYears: property.installmentYears ?? null,
    installmentMonthly: property.installmentMonthly ?? null,
    sourceType: property.sourceType,
    sourceFile: property.sourceFile ?? null,
    sourceSheet: property.sourceSheet ?? null,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString()
  };
}

export function mapAppointment(appointment: PrismaAppointment): Appointment {
  return {
    id: appointment.id,
    userId: appointment.userId,
    propertyId: appointment.propertyId,
    datetime: appointment.datetime.toISOString(),
    status: appointment.status,
    contactName: appointment.contactName,
    contactPhone: appointment.contactPhone,
    notes: appointment.notes ?? undefined,
    suggestedSlots: appointment.suggestedSlots.map((slot) => slot.toISOString()),
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString()
  };
}

export function mapFavorite(favorite: PrismaFavorite): Favorite {
  return {
    id: favorite.id,
    userId: favorite.userId,
    propertyId: favorite.propertyId,
    createdAt: favorite.createdAt.toISOString()
  };
}

export function mapSavedSearch(savedSearch: PrismaSavedSearch): SavedSearch {
  return {
    id: savedSearch.id,
    userId: savedSearch.userId,
    queryJson: JSON.stringify(savedSearch.queryJson),
    createdAt: savedSearch.createdAt.toISOString()
  };
}

export function mapSellerMessage(message: PrismaSellerMessage): SellerMessage {
  return {
    id: message.id,
    sellerId: message.sellerId,
    buyerId: message.buyerId,
    propertyId: message.propertyId,
    appointmentId: message.appointmentId,
    subject: message.subject,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    readAt: toIso(message.readAt)
  };
}

export function mapCommunityPost(post: PrismaCommunityPost): CommunityPost {
  return {
    id: post.id,
    userId: post.userId,
    text: post.text,
    imageUrl: post.imagePath ?? null,
    imagePath: post.imagePath ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString()
  };
}

export function mapCommunityPostLike(like: PrismaCommunityPostLike): CommunityPostLike {
  return {
    id: like.id,
    postId: like.postId,
    userId: like.userId,
    reaction: like.reaction,
    createdAt: like.createdAt.toISOString()
  };
}

export function mapCommunityPostComment(comment: PrismaCommunityPostComment): CommunityPostComment {
  return {
    id: comment.id,
    postId: comment.postId,
    userId: comment.userId,
    text: comment.text,
    parentCommentId: comment.parentCommentId ?? null,
    createdAt: comment.createdAt.toISOString()
  };
}

export function mapCommunityPostCommentLike(like: PrismaCommunityPostCommentLike): CommunityPostCommentLike {
  return {
    id: like.id,
    postId: like.postId,
    commentId: like.commentId,
    userId: like.userId,
    createdAt: like.createdAt.toISOString()
  };
}

export function mapCommunityListingLike(like: PrismaCommunityListingLike): CommunityListingLike {
  return {
    id: like.id,
    listingId: like.listingId,
    userId: like.userId,
    createdAt: like.createdAt.toISOString()
  };
}

export function mapCommunityListingComment(comment: PrismaCommunityListingComment): CommunityListingComment {
  return {
    id: comment.id,
    listingId: comment.listingId,
    userId: comment.userId,
    text: comment.text,
    parentCommentId: comment.parentCommentId ?? null,
    createdAt: comment.createdAt.toISOString()
  };
}

export function mapCommunityListingCommentLike(like: PrismaCommunityListingCommentLike): CommunityListingCommentLike {
  return {
    id: like.id,
    listingId: like.listingId,
    commentId: like.commentId,
    userId: like.userId,
    createdAt: like.createdAt.toISOString()
  };
}

export async function ensureAdminAccount() {
  const existing = await prisma.user.findFirst({
    where: {
      role: "ADMIN",
      email: "admin@example.com"
    }
  });

  if (existing) {
    if (existing.password) return existing;
    return prisma.user.update({
      where: { id: existing.id },
      data: { password: "123456" }
    });
  }

  return prisma.user.create({
    data: {
      id: "u-admin-1",
      name: "Platform Admin",
      email: "admin@example.com",
      phone: "+201000000003",
      password: "123456",
      role: "ADMIN",
      blocked: false
    }
  });
}

export async function findUserById(id?: string | null) {
  if (!id) return null;
  await ensureAdminAccount();
  return prisma.user.findUnique({
    where: { id },
    include: { companyOwner: true }
  });
}

export async function getSellerDashboardScopeIds(sellerId: string) {
  const members = await prisma.user.findMany({
    where: {
      role: "SELLER",
      companyOwnerId: sellerId
    },
    select: { id: true }
  });
  return members.length > 0 ? [sellerId, ...members.map((member) => member.id)] : [sellerId];
}

export async function canSellerAccessListing(viewerSellerId: string, listingOwnerSellerId: string) {
  if (viewerSellerId === listingOwnerSellerId) return true;
  const owner = await prisma.user.findUnique({
    where: { id: listingOwnerSellerId },
    select: { companyOwnerId: true, role: true }
  });
  return Boolean(owner && owner.role === "SELLER" && owner.companyOwnerId === viewerSellerId);
}

function currentPrice(item: PublicPropertyCard) {
  return item.transaction === "RENT" ? item.rentPrice ?? 0 : item.price ?? 0;
}

function compareById(a: PublicPropertyCard, b: PublicPropertyCard) {
  return a.id.localeCompare(b.id);
}

export function toPublicPropertyCard(property: PropertyWithCardRelations): PublicPropertyCard {
  const propertyModel = mapProperty(property)!;
  const seller = property.listing.user;
  const ownerCompany = seller.companyOwner;
  const valueForDeal = property.transaction === "RENT" ? property.rentPrice ?? 0 : property.price ?? 0;
  const media = propertyModel.media ?? [];
  const hasPanorama360 = media.some((item) => item.kind === "PANORAMA_360");
  const hasSpin360 = media.some((item) => item.kind === "SPIN_360_FRAME");

  return {
    ...propertyModel,
    listingStatus: property.listing.status,
    verified: property.listing.status === "APPROVED",
    sellerId: property.listing.userId,
    listedByName: seller.name,
    listedByCompanyName: ownerCompany?.name,
    listedByPhone: seller.phone ?? ownerCompany?.phone ?? undefined,
    goodDeal: property.areaSqm > 0 ? valueForDeal / property.areaSqm < 28000 : false,
    has360View: hasPanorama360 || hasSpin360,
    hasPanorama360,
    hasSpin360
  };
}

export async function loadPublicPropertyCards(filters: SearchFilters = {}) {
  const items = await prisma.property.findMany({
    where: buildPrismaPropertyWhere(filters),
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

  return items.map(toPublicPropertyCard);
}

export async function searchPropertyCards(filters: SearchFilters) {
  const requestedPage = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, Math.min(40, filters.pageSize ?? 20));
  let items = await loadPublicPropertyCards(filters);

  if (filters.downPaymentMax !== undefined) {
    items = items.filter((item) => (item.installmentDownPayment ?? Number.MAX_SAFE_INTEGER) <= filters.downPaymentMax!);
  }
  if (filters.installmentYearsMax !== undefined) {
    items = items.filter((item) => (item.installmentYears ?? Number.MAX_SAFE_INTEGER) <= filters.installmentYearsMax!);
  }
  if (filters.installmentMonthlyMax !== undefined) {
    items = items.filter((item) => (item.installmentMonthly ?? Number.MAX_SAFE_INTEGER) <= filters.installmentMonthlyMax!);
  }
  if (filters.lat !== undefined && filters.lng !== undefined) {
    items = items.map((item) => ({
      ...item,
      distanceKm: haversineDistanceKm(filters.lat!, filters.lng!, item.lat, item.lng)
    }));
    if (filters.distanceKm !== undefined) {
      items = items.filter((item) => (item.distanceKm ?? 0) <= filters.distanceKm!);
    }
  }

  const sort = filters.sort ?? "FEATURED";
  items.sort((a, b) => {
    if (sort === "FEATURED") {
      return Number(b.goodDeal) - Number(a.goodDeal) || currentPrice(a) - currentPrice(b) || compareById(a, b);
    }
    if (sort === "NEWEST") return Date.parse(b.createdAt) - Date.parse(a.createdAt) || compareById(a, b);
    if (sort === "PRICE_ASC") return currentPrice(a) - currentPrice(b) || compareById(a, b);
    if (sort === "PRICE_DESC") return currentPrice(b) - currentPrice(a) || compareById(a, b);
    if (sort === "AREA_DESC") return b.areaSqm - a.areaSqm || compareById(a, b);
    if (sort === "DISTANCE_ASC") return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999) || compareById(a, b);
    return compareById(a, b);
  });

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;
  return {
    total,
    page,
    pageSize,
    items: items.slice(offset, offset + pageSize)
  };
}

export async function validateProfileInput(input: {
  name: string;
  email: string;
  phone?: string;
  password?: string;
}) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim();
  const password = input.password;

  if (!name || !email) return { ok: false as const, error: "Name and email are required." };
  if (password !== undefined && password.length < 6) return { ok: false as const, error: "Password must be at least 6 characters." };
  if (phone && !isValidPhoneNumber(phone)) {
    return { ok: false as const, error: "Phone number must be 11 digits and start with 01." };
  }

  return { ok: true as const, name, email, phone, password };
}

export function uniqueStringArray(values: string[]) {
  return Array.from(new Set(values));
}

export function newId() {
  return randomUUID();
}

export async function getCommunityPostView(postId: string, viewerId?: string | null) {
  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    include: {
      user: {
        include: {
          companyOwner: true
        }
      },
      likes: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: true
        }
      },
      commentLikes: true
    }
  });
  return post ? mapCommunityPostView(post, viewerId) : null;
}

export async function getCommunityListingView(listingId: string, viewerId?: string | null) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      user: {
        include: {
          companyOwner: true
        }
      },
      property: {
        include: {
          media: { orderBy: { sortOrder: "asc" } }
        }
      },
      communityLikes: true,
      communityComments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: true
        }
      },
      communityCommentLikes: true
    }
  });
  return listing ? mapCommunityListingView(listing, viewerId) : null;
}

export async function listCommunityPostViews(viewerId?: string | null) {
  const posts = await prisma.communityPost.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        include: {
          companyOwner: true
        }
      },
      likes: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: true
        }
      },
      commentLikes: true
    }
  });
  return posts.map((post) => mapCommunityPostView(post, viewerId));
}

export async function listCommunityListingViews(viewerId?: string | null) {
  const listings = await prisma.listing.findMany({
    where: { status: "APPROVED" },
    orderBy: { updatedAt: "desc" },
    include: {
      user: {
        include: {
          companyOwner: true
        }
      },
      property: {
        include: {
          media: { orderBy: { sortOrder: "asc" } }
        }
      },
      communityLikes: true,
      communityComments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: true
        }
      },
      communityCommentLikes: true
    }
  });
  return listings
    .filter((listing) => Boolean(listing.property))
    .map((listing) => mapCommunityListingView(listing, viewerId));
}

function buildCommentViews<
  TComment extends { id: string; text: string; createdAt: Date; userId: string; parentCommentId: string | null; user: PrismaUser },
  TLike extends { commentId: string; userId: string }
>(
  comments: TComment[],
  commentLikes: TLike[],
  viewerId?: string | null,
  viewerIsAdmin = false
) {
  const likesCountByCommentId = new Map<string, number>();
  const likedByViewerCommentId = new Set<string>();

  for (const like of commentLikes) {
    likesCountByCommentId.set(like.commentId, (likesCountByCommentId.get(like.commentId) ?? 0) + 1);
    if (viewerId && like.userId === viewerId) likedByViewerCommentId.add(like.commentId);
  }

  const commentViews: CommunityCommentView[] = comments.map((comment) => ({
    id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
    canDelete: Boolean(viewerId && (comment.userId === viewerId || viewerIsAdmin)),
    likesCount: likesCountByCommentId.get(comment.id) ?? 0,
    likedByViewer: Boolean(viewerId && likedByViewerCommentId.has(comment.id)),
    user: {
      id: comment.user.id,
      name: comment.user.name,
      avatarUrl: comment.user.avatarPath ?? null
    }
  }));

  const viewsById = new Map(commentViews.map((comment) => [comment.id, comment]));
  const repliesByParent = new Map<string, CommunityCommentView[]>();
  const topLevel: CommunityCommentView[] = [];

  for (const raw of comments) {
    if (!raw.parentCommentId) continue;
    const view = viewsById.get(raw.id);
    if (!view) continue;
    const list = repliesByParent.get(raw.parentCommentId) ?? [];
    list.push(view);
    repliesByParent.set(raw.parentCommentId, list);
  }

  for (const raw of comments) {
    const view = viewsById.get(raw.id);
    if (!view) continue;
    const replies = repliesByParent.get(raw.id);
    view.replies = replies;
    view.repliesCount = replies?.length ?? 0;
    if (!raw.parentCommentId) topLevel.push(view);
  }

  return topLevel;
}

function mapCommunityPostView(post: CommunityPostWithRelations, viewerId?: string | null): CommunityPostView {
  const author = post.user;
  const viewerIsAdmin = Boolean(viewerId) && false;
  const likeCount = post.likes.filter((like) => like.reaction === "LIKE").length;
  const loveCount = post.likes.filter((like) => like.reaction === "LOVE").length;
  const viewerReaction = viewerId ? post.likes.find((like) => like.userId === viewerId)?.reaction ?? null : null;

  return {
    id: post.id,
    text: post.text,
    imageUrl: post.imagePath ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    user: {
      id: author.id,
      name: author.name,
      avatarUrl: author.avatarPath ?? null,
      isDeveloper: author.isCompanyAccount,
      companyName: author.companyOwner?.name ?? null
    },
    likesCount: post.likes.length,
    likeCount,
    loveCount,
    commentsCount: post.comments.length,
    reactionByViewer: viewerReaction,
    comments: buildCommentViews(post.comments, post.commentLikes, viewerId, viewerIsAdmin)
  };
}

function mapCommunityListingView(listing: CommunityListingWithRelations, viewerId?: string | null): CommunityListingView {
  const property = listing.property!;
  const mappedProperty = mapProperty(property)!;
  const seller = listing.user;
  const viewerIsAdmin = false;

  return {
    listingId: listing.id,
    propertyId: property.id,
    title: property.title,
    description: property.description,
    imageUrl: getPropertyCoverImage(mappedProperty.images, mappedProperty.media),
    city: property.city,
    area: property.area,
    district: property.district,
    transaction: property.transaction,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
    seller: {
      id: seller.id,
      name: seller.name,
      avatarUrl: seller.avatarPath ?? null,
      isDeveloper: seller.isCompanyAccount
    },
    likesCount: listing.communityLikes.length,
    likedByViewer: viewerId ? listing.communityLikes.some((like) => like.userId === viewerId) : false,
    commentsCount: listing.communityComments.length,
    comments: buildCommentViews(listing.communityComments, listing.communityCommentLikes, viewerId, viewerIsAdmin)
  };
}

export async function listNotificationsInternal(userId: string): Promise<NotificationItem[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { companyOwner: true }
  });
  if (!user) return [];

  const [
    savedSearches,
    posts,
    postLikes,
    postComments,
    postCommentLikes,
    listings,
    listingLikes,
    listingComments,
    listingCommentLikes,
    appointments,
    users
  ] = await Promise.all([
    prisma.savedSearch.findMany({ where: { userId } }),
    prisma.communityPost.findMany(),
    prisma.communityPostLike.findMany(),
    prisma.communityPostComment.findMany(),
    prisma.communityPostCommentLike.findMany(),
    prisma.listing.findMany(),
    prisma.communityListingLike.findMany(),
    prisma.communityListingComment.findMany(),
    prisma.communityListingCommentLike.findMany(),
    prisma.appointment.findMany(),
    prisma.user.findMany()
  ]);

  const [properties] = await Promise.all([prisma.property.findMany()]);
  const propertyById = new Map(properties.map((property) => [property.id, property]));
  const listingById = new Map(listings.map((listing) => [listing.id, listing]));
  const userById = new Map(users.map((item) => [item.id, item]));
  const postById = new Map(posts.map((post) => [post.id, post]));
  const commentersByPostId = new Map<string, Set<string>>();
  const commentersByListingId = new Map<string, Set<string>>();

  for (const comment of postComments) {
    const set = commentersByPostId.get(comment.postId) ?? new Set<string>();
    set.add(comment.userId);
    commentersByPostId.set(comment.postId, set);
  }

  for (const comment of listingComments) {
    const set = commentersByListingId.get(comment.listingId) ?? new Set<string>();
    set.add(comment.userId);
    commentersByListingId.set(comment.listingId, set);
  }

  const savedSearchNotes: NotificationItem[] = savedSearches.map((savedSearch) => ({
    id: `n-ss-${savedSearch.id}`,
    text: "Saved search alert is active.",
    createdAt: savedSearch.createdAt.toISOString(),
    href: "/search"
  }));

  const communityPostLikeNotes: NotificationItem[] = postLikes
    .filter((like) => {
      const post = postById.get(like.postId);
      if (!post) return false;
      const postOwner = userById.get(post.userId);
      const targets = new Set<string>([post.userId]);
      if (postOwner?.companyOwnerId) targets.add(postOwner.companyOwnerId);
      return targets.has(userId) && like.userId !== userId;
    })
    .map((like) => {
      const post = postById.get(like.postId)!;
      const actor = userById.get(like.userId);
      return {
        id: `n-community-post-like-${like.id}`,
        text: `${actor?.name ?? "Someone"} liked your community post.`,
        createdAt: like.createdAt.toISOString(),
        href: `/community?post=${encodeURIComponent(post.id)}`
      };
    });

  const communityPostCommentNotes: NotificationItem[] = postComments
    .filter((comment) => {
      const post = postById.get(comment.postId);
      if (!post) return false;
      const postOwner = userById.get(post.userId);
      const targets = new Set<string>([post.userId]);
      if (postOwner?.companyOwnerId) targets.add(postOwner.companyOwnerId);
      return targets.has(userId) && comment.userId !== userId;
    })
    .map((comment) => {
      const post = postById.get(comment.postId)!;
      const actor = userById.get(comment.userId);
      return {
        id: `n-community-post-comment-${comment.id}`,
        text: `${actor?.name ?? "Someone"} commented on your community post.`,
        createdAt: comment.createdAt.toISOString(),
        href: `/community?post=${encodeURIComponent(post.id)}&comment=${encodeURIComponent(comment.id)}`
      };
    });

  const communityPostParticipantCommentNotes: NotificationItem[] = postComments
    .filter((comment) => {
      const participants = commentersByPostId.get(comment.postId);
      if (!participants || !participants.has(userId) || comment.userId === userId) return false;
      const post = postById.get(comment.postId);
      if (!post || post.userId === userId) return false;
      return true;
    })
    .map((comment) => {
      const actor = userById.get(comment.userId);
      return {
        id: `n-community-post-participant-comment-${comment.id}-${userId}`,
        text: `${actor?.name ?? "Someone"} commented on a post you commented on.`,
        createdAt: comment.createdAt.toISOString(),
        href: `/community?post=${encodeURIComponent(comment.postId)}&comment=${encodeURIComponent(comment.id)}`
      };
    });

  const communityListingLikeNotes: NotificationItem[] = listingLikes
    .filter((like) => {
      const listing = listingById.get(like.listingId);
      if (!listing) return false;
      const listingOwner = userById.get(listing.userId);
      const targets = new Set<string>([listing.userId]);
      if (listingOwner?.companyOwnerId) targets.add(listingOwner.companyOwnerId);
      return targets.has(userId) && like.userId !== userId;
    })
    .map((like) => {
      const listing = listingById.get(like.listingId)!;
      const property = properties.find((item) => item.listingId === listing.id);
      const actor = userById.get(like.userId);
      return {
        id: `n-community-listing-like-${like.id}`,
        text: `${actor?.name ?? "Someone"} liked ${property?.title ?? "your listing"}.`,
        createdAt: like.createdAt.toISOString(),
        href: `/community?listing=${encodeURIComponent(listing.id)}`
      };
    });

  const communityListingCommentNotes: NotificationItem[] = listingComments
    .filter((comment) => {
      const listing = listingById.get(comment.listingId);
      if (!listing) return false;
      const listingOwner = userById.get(listing.userId);
      const targets = new Set<string>([listing.userId]);
      if (listingOwner?.companyOwnerId) targets.add(listingOwner.companyOwnerId);
      return targets.has(userId) && comment.userId !== userId;
    })
    .map((comment) => {
      const listing = listingById.get(comment.listingId)!;
      const property = properties.find((item) => item.listingId === listing.id);
      const actor = userById.get(comment.userId);
      return {
        id: `n-community-listing-comment-${comment.id}`,
        text: `${actor?.name ?? "Someone"} commented on ${property?.title ?? "your listing"}.`,
        createdAt: comment.createdAt.toISOString(),
        href: `/community?listing=${encodeURIComponent(listing.id)}&comment=${encodeURIComponent(comment.id)}`
      };
    });

  const communityListingParticipantCommentNotes: NotificationItem[] = listingComments
    .filter((comment) => {
      const participants = commentersByListingId.get(comment.listingId);
      if (!participants || !participants.has(userId) || comment.userId === userId) return false;
      const listing = listingById.get(comment.listingId);
      if (!listing || listing.userId === userId) return false;
      return true;
    })
    .map((comment) => {
      const actor = userById.get(comment.userId);
      return {
        id: `n-community-listing-participant-comment-${comment.id}-${userId}`,
        text: `${actor?.name ?? "Someone"} commented on a listing you commented on.`,
        createdAt: comment.createdAt.toISOString(),
        href: `/community?listing=${encodeURIComponent(comment.listingId)}&comment=${encodeURIComponent(comment.id)}`
      };
    });

  const communityPostReplyNotes: NotificationItem[] = postComments
    .filter((comment) => {
      if (!comment.parentCommentId) return false;
      const parent = postComments.find((item) => item.id === comment.parentCommentId && item.postId === comment.postId);
      return Boolean(parent && parent.userId === userId && comment.userId !== userId);
    })
    .map((comment) => {
      const actor = userById.get(comment.userId);
      return {
        id: `n-community-post-reply-${comment.id}`,
        text: `${actor?.name ?? "Someone"} replied to your comment.`,
        createdAt: comment.createdAt.toISOString(),
        href: `/community?post=${encodeURIComponent(comment.postId)}&comment=${encodeURIComponent(comment.id)}`
      };
    });

  const communityListingReplyNotes: NotificationItem[] = listingComments
    .filter((comment) => {
      if (!comment.parentCommentId) return false;
      const parent = listingComments.find(
        (item) => item.id === comment.parentCommentId && item.listingId === comment.listingId
      );
      return Boolean(parent && parent.userId === userId && comment.userId !== userId);
    })
    .map((comment) => {
      const actor = userById.get(comment.userId);
      return {
        id: `n-community-listing-reply-${comment.id}`,
        text: `${actor?.name ?? "Someone"} replied to your comment.`,
        createdAt: comment.createdAt.toISOString(),
        href: `/community?listing=${encodeURIComponent(comment.listingId)}&comment=${encodeURIComponent(comment.id)}`
      };
    });

  const communityPostCommentLikeNotes: NotificationItem[] = postCommentLikes
    .filter((like) => {
      const comment = postComments.find((item) => item.id === like.commentId && item.postId === like.postId);
      return Boolean(comment && comment.userId === userId && like.userId !== userId);
    })
    .map((like) => {
      const actor = userById.get(like.userId);
      return {
        id: `n-community-post-comment-like-${like.id}`,
        text: `${actor?.name ?? "Someone"} liked your comment.`,
        createdAt: like.createdAt.toISOString(),
        href: `/community?post=${encodeURIComponent(like.postId)}&comment=${encodeURIComponent(like.commentId)}`
      };
    });

  const communityListingCommentLikeNotes: NotificationItem[] = listingCommentLikes
    .filter((like) => {
      const comment = listingComments.find(
        (item) => item.id === like.commentId && item.listingId === like.listingId
      );
      return Boolean(comment && comment.userId === userId && like.userId !== userId);
    })
    .map((like) => {
      const actor = userById.get(like.userId);
      return {
        id: `n-community-listing-comment-like-${like.id}`,
        text: `${actor?.name ?? "Someone"} liked your comment.`,
        createdAt: like.createdAt.toISOString(),
        href: `/community?listing=${encodeURIComponent(like.listingId)}&comment=${encodeURIComponent(like.commentId)}`
      };
    });

  if (user.role === "BUYER") {
    const appointmentNotes = appointments
      .filter((appointment) => appointment.userId === userId && appointment.status !== "PENDING")
      .map((appointment) => {
        const property = propertyById.get(appointment.propertyId);
        const label = property?.title ?? appointment.propertyId;
        const text =
          appointment.status === "RESCHEDULED" && appointment.suggestedSlots.length > 0
            ? `Seller suggested new slots for ${label}. Open Appointments to choose one.`
            : appointment.status === "CONFIRMED"
              ? `Viewing for ${label} is confirmed at ${appointment.datetime.toLocaleString()}.`
              : appointment.status === "CANCELLED"
                ? `Viewing for ${label} was cancelled by seller.`
                : `Update on ${label}.`;

        return {
          id: `n-buyer-ap-${appointment.id}-${appointment.updatedAt.toISOString()}`,
          text,
          createdAt: appointment.updatedAt.toISOString(),
          href: `/appointments?request=${encodeURIComponent(appointment.id)}`
        };
      });

    return [
      ...appointmentNotes,
      ...savedSearchNotes,
      ...communityPostLikeNotes,
      ...communityPostCommentNotes,
      ...communityPostParticipantCommentNotes,
      ...communityListingLikeNotes,
      ...communityListingCommentNotes,
      ...communityListingParticipantCommentNotes,
      ...communityPostReplyNotes,
      ...communityListingReplyNotes,
      ...communityPostCommentLikeNotes,
      ...communityListingCommentLikeNotes
    ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  if (user.role === "SELLER") {
    const scopeIds = new Set(await getSellerDashboardScopeIds(userId));

    const appointmentNotes: NotificationItem[] = appointments
      .filter((appointment) => {
        if (appointment.status !== "PENDING") return false;
        const property = propertyById.get(appointment.propertyId);
        if (!property) return false;
        const listing = listingById.get(property.listingId);
        return Boolean(listing && scopeIds.has(listing.userId));
      })
      .map((appointment) => {
        const buyer = userById.get(appointment.userId);
        const property = propertyById.get(appointment.propertyId)!;
        const text =
          appointment.updatedAt.getTime() !== appointment.createdAt.getTime() && appointment.suggestedSlots.length === 0
            ? `${buyer?.name ?? "Buyer"} selected a proposed slot for ${property.title}. Waiting your confirmation.`
            : `New viewing request from ${buyer?.name ?? "Buyer"} for ${property.title}.`;
        return {
          id: `n-seller-ap-${appointment.id}-${appointment.updatedAt.toISOString()}`,
          text,
          createdAt: appointment.updatedAt.toISOString(),
          href: `/appointments?request=${encodeURIComponent(appointment.id)}`
        };
      });

    const listingReviewNotes = listings
      .filter(
        (listing) =>
          scopeIds.has(listing.userId) &&
          Boolean(listing.reviewedAt) &&
          (listing.status === "APPROVED" || listing.status === "REJECTED")
      )
      .map((listing) => {
        const property = properties.find((item) => item.listingId === listing.id);
        return {
          id: `n-seller-listing-${listing.id}-${(listing.reviewedAt ?? listing.updatedAt).toISOString()}`,
          text:
            listing.status === "APPROVED"
              ? `Admin approved your listing: ${property?.title ?? `Listing ${listing.id}`}.`
              : `Admin rejected your listing: ${property?.title ?? `Listing ${listing.id}`}. Check notes and update it.`,
          createdAt: (listing.reviewedAt ?? listing.updatedAt).toISOString(),
          href: `/seller/listings/${listing.id}/edit`
        };
      });

    return [
      ...appointmentNotes,
      ...listingReviewNotes,
      ...communityPostLikeNotes,
      ...communityPostCommentNotes,
      ...communityPostParticipantCommentNotes,
      ...communityListingLikeNotes,
      ...communityListingCommentNotes,
      ...communityListingParticipantCommentNotes,
      ...communityPostReplyNotes,
      ...communityListingReplyNotes,
      ...communityPostCommentLikeNotes,
      ...communityListingCommentLikeNotes,
      ...savedSearchNotes
    ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  if (user.role === "ADMIN") {
    const adminAppointmentNotes = appointments
      .filter((appointment) => appointment.status === "PENDING")
      .map((appointment) => {
        const buyer = userById.get(appointment.userId);
        const property = propertyById.get(appointment.propertyId);
        return {
          id: `n-admin-ap-${appointment.id}-${appointment.updatedAt.toISOString()}`,
          text: `New viewing request from ${buyer?.name ?? "Buyer"} for ${property?.title ?? appointment.propertyId}.`,
          createdAt: appointment.updatedAt.toISOString(),
          href: `/admin?appointment=${encodeURIComponent(appointment.id)}`
        };
      });

    const adminListingSubmissionNotes = listings
      .filter((listing) => listing.status === "PENDING")
      .map((listing) => {
        const seller = userById.get(listing.userId);
        const property = properties.find((item) => item.listingId === listing.id);
        const isResubmitted = listing.updatedAt.getTime() > listing.createdAt.getTime();
        return {
          id: `n-admin-pending-${listing.id}-${listing.updatedAt.toISOString()}`,
          text: isResubmitted
            ? `${seller?.name ?? "Seller"} resubmitted ${property?.title ?? `Listing ${listing.id}`} for review.`
            : `${seller?.name ?? "Seller"} submitted new listing ${property?.title ?? `Listing ${listing.id}`} for review.`,
          createdAt: listing.updatedAt.toISOString(),
          href: `/admin/listings/${listing.id}`
        };
      });

    return [
      ...adminAppointmentNotes,
      ...adminListingSubmissionNotes,
      ...communityPostLikeNotes,
      ...communityPostCommentNotes,
      ...communityPostParticipantCommentNotes,
      ...communityListingLikeNotes,
      ...communityListingCommentNotes,
      ...communityListingParticipantCommentNotes,
      ...communityPostReplyNotes,
      ...communityListingReplyNotes,
      ...communityPostCommentLikeNotes,
      ...communityListingCommentLikeNotes,
      ...savedSearchNotes
    ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  return [
    ...savedSearchNotes,
    ...communityPostLikeNotes,
    ...communityPostCommentNotes,
    ...communityPostParticipantCommentNotes,
    ...communityListingLikeNotes,
    ...communityListingCommentNotes,
    ...communityListingParticipantCommentNotes,
    ...communityPostReplyNotes,
    ...communityListingReplyNotes,
    ...communityPostCommentLikeNotes,
    ...communityListingCommentLikeNotes
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

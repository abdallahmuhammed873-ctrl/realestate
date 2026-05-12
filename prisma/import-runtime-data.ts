import { PrismaClient } from "@prisma/client";
import { loadRuntimeData } from "./runtime-data.ts";

function parseQueryJson(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

export async function importRuntimeData(prisma: PrismaClient) {
  const data = loadRuntimeData();

  await prisma.communityListingCommentLike.deleteMany();
  await prisma.communityListingComment.deleteMany();
  await prisma.communityListingLike.deleteMany();
  await prisma.communityPostCommentLike.deleteMany();
  await prisma.communityPostComment.deleteMany();
  await prisma.communityPostLike.deleteMany();
  await prisma.communityPost.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.sellerMessage.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.propertyMedia.deleteMany();
  await prisma.property.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  for (const user of data.users) {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: user.password,
        avatarPath: user.avatarPath ?? user.avatarUrl ?? null,
        blocked: user.blocked ?? false,
        role: user.role,
        isCompanyAccount: user.isCompanyAccount ?? false,
        companyOwnerId: user.companyOwnerId ?? null,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt)
      }
    });
  }

  for (const listing of data.listings) {
    await prisma.listing.create({
      data: {
        id: listing.id,
        userId: listing.userId,
        status: listing.status,
        feesPaid: listing.feesPaid ?? false,
        adminNotes: listing.adminNotes ?? null,
        reviewedBy: listing.reviewedBy ?? null,
        reviewedAt: listing.reviewedAt ? new Date(listing.reviewedAt) : null,
        createdAt: new Date(listing.createdAt),
        updatedAt: new Date(listing.updatedAt)
      }
    });
  }

  for (const property of data.properties) {
    await prisma.property.create({
      data: {
        id: property.id,
        listingId: property.listingId,
        title: property.title,
        description: property.description,
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
        hasGarden: property.hasGarden ?? false,
        hasRoof: property.hasRoof ?? false,
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
        images: property.images,
        installmentDownPayment: property.installmentDownPayment ?? null,
        installmentYears: property.installmentYears ?? null,
        installmentMonthly: property.installmentMonthly ?? null,
        sourceType: property.sourceType ?? "MANUAL",
        sourceFile: property.sourceFile ?? null,
        sourceSheet: property.sourceSheet ?? null,
        createdAt: new Date(property.createdAt),
        updatedAt: new Date(property.updatedAt),
        media: {
          create: (property.media?.length
            ? property.media
            : property.images.map((imagePath: string, index: number) => ({
            id: undefined,
            propertyId: property.id,
            kind: "IMAGE" as const,
            path: imagePath,
            label: null,
            altText: property.title,
            sortOrder: index,
            mimeType: null,
            createdAt: property.createdAt,
            updatedAt: property.updatedAt
          }))).map((media: Record<string, any>, index: number) => ({
            kind: media.kind,
            path: media.path,
            label: media.label ?? null,
            altText: media.altText ?? property.title,
            sortOrder: media.sortOrder ?? index,
            mimeType: media.mimeType ?? null,
            createdAt: new Date(media.createdAt ?? property.createdAt),
            updatedAt: new Date(media.updatedAt ?? property.updatedAt)
          }))
        }
      }
    });
  }

  for (const favorite of data.favorites) {
    await prisma.favorite.create({
      data: {
        id: favorite.id,
        userId: favorite.userId,
        propertyId: favorite.propertyId,
        createdAt: new Date(favorite.createdAt)
      }
    });
  }

  for (const appointment of data.appointments) {
    await prisma.appointment.create({
      data: {
        id: appointment.id,
        userId: appointment.userId,
        propertyId: appointment.propertyId,
        datetime: new Date(appointment.datetime),
        status: appointment.status,
        contactName: appointment.contactName,
        contactPhone: appointment.contactPhone,
        notes: appointment.notes ?? null,
        suggestedSlots: appointment.suggestedSlots.map((slot: string) => new Date(slot)),
        createdAt: new Date(appointment.createdAt),
        updatedAt: new Date(appointment.updatedAt)
      }
    });
  }

  for (const savedSearch of data.savedSearches) {
    await prisma.savedSearch.create({
      data: {
        id: savedSearch.id,
        userId: savedSearch.userId,
        queryJson: parseQueryJson(savedSearch.queryJson),
        createdAt: new Date(savedSearch.createdAt)
      }
    });
  }

  for (const message of data.sellerMessages) {
    await prisma.sellerMessage.create({
      data: {
        id: message.id,
        sellerId: message.sellerId,
        buyerId: message.buyerId,
        propertyId: message.propertyId,
        appointmentId: message.appointmentId,
        subject: message.subject,
        body: message.body,
        readAt: message.readAt ? new Date(message.readAt) : null,
        createdAt: new Date(message.createdAt)
      }
    });
  }

  for (const post of data.communityPosts) {
    await prisma.communityPost.create({
      data: {
        id: post.id,
        userId: post.userId,
        text: post.text,
        imagePath: post.imagePath ?? post.imageUrl ?? null,
        createdAt: new Date(post.createdAt),
        updatedAt: new Date(post.updatedAt)
      }
    });
  }

  for (const like of data.communityPostLikes) {
    await prisma.communityPostLike.create({
      data: {
        id: like.id,
        postId: like.postId,
        userId: like.userId,
        reaction: like.reaction,
        createdAt: new Date(like.createdAt)
      }
    });
  }

  for (const comment of data.communityPostComments) {
    await prisma.communityPostComment.create({
      data: {
        id: comment.id,
        postId: comment.postId,
        userId: comment.userId,
        text: comment.text,
        parentCommentId: comment.parentCommentId ?? null,
        createdAt: new Date(comment.createdAt)
      }
    });
  }

  for (const like of data.communityPostCommentLikes) {
    await prisma.communityPostCommentLike.create({
      data: {
        id: like.id,
        postId: like.postId,
        commentId: like.commentId,
        userId: like.userId,
        createdAt: new Date(like.createdAt)
      }
    });
  }

  for (const like of data.communityListingLikes) {
    await prisma.communityListingLike.create({
      data: {
        id: like.id,
        listingId: like.listingId,
        userId: like.userId,
        createdAt: new Date(like.createdAt)
      }
    });
  }

  for (const comment of data.communityListingComments) {
    await prisma.communityListingComment.create({
      data: {
        id: comment.id,
        listingId: comment.listingId,
        userId: comment.userId,
        text: comment.text,
        parentCommentId: comment.parentCommentId ?? null,
        createdAt: new Date(comment.createdAt)
      }
    });
  }

  for (const like of data.communityListingCommentLikes) {
    await prisma.communityListingCommentLike.create({
      data: {
        id: like.id,
        listingId: like.listingId,
        commentId: like.commentId,
        userId: like.userId,
        createdAt: new Date(like.createdAt)
      }
    });
  }
}

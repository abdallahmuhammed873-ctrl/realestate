import {
  CommunityListingView,
  CommunityPostView,
  getCommunityListingView,
  getCommunityPostView,
  getSellerCommunityPostScopeIds,
  listCommunityListingViews,
  listCommunityListingViewsBySellerIds,
  listCommunityPostViews,
  listCommunityPostViewsByAuthorIds,
  mapCommunityListingCommentLike,
  mapCommunityPost,
  mapUser,
  newId
} from "../server/repository-helpers.ts";
import { isLocalUploadPath, isTempUploadPath, promoteCommunityImage } from "../server/local-media.ts";
import { prisma } from "../server/prisma.ts";

async function canInteract(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  if (!user || user.blocked) return null;
  return user;
}

export async function listCommunityPosts(viewerId?: string | null) {
  return listCommunityPostViews(viewerId);
}

export async function listSellerCommunityPosts(authorId: string, viewerId?: string | null) {
  return listCommunityPostViewsByAuthorIds([authorId], viewerId);
}

export async function listSellerCommunityListings(authorId: string, viewerId?: string | null) {
  return listCommunityListingViewsBySellerIds([authorId], viewerId);
}

export async function listSellerCompanyCommunityPosts(authorId: string, viewerId?: string | null) {
  const authorIds = await getSellerCommunityPostScopeIds(authorId);
  return listCommunityPostViewsByAuthorIds(authorIds, viewerId);
}

export async function listSellerCompanyCommunityListings(authorId: string, viewerId?: string | null) {
  const authorIds = await getSellerCommunityPostScopeIds(authorId);
  return listCommunityListingViewsBySellerIds(authorIds, viewerId);
}

export async function listCommunityListings(viewerId?: string | null) {
  return listCommunityListingViews(viewerId);
}

export async function createCommunityPost(userId: string, input: { text: string; imagePath?: string }) {
  const user = await canInteract(userId);
  if (!user) return { ok: false as const, error: "You are not allowed to post." };
  if (user.role !== "SELLER") return { ok: false as const, error: "Only sellers and developers can create posts." };

  const text = input.text.trim();
  const imagePath = (input.imagePath ?? "").trim();
  if (!text) return { ok: false as const, error: "Post text is required." };
  if (text.length > 1000) return { ok: false as const, error: "Post text must be 1000 characters or less." };
  if (imagePath && !isLocalUploadPath(imagePath)) {
    return { ok: false as const, error: "Post image must be uploaded through the platform." };
  }
  if (imagePath && isTempUploadPath(imagePath) && !imagePath.startsWith(`/uploads/tmp/community/${userId}/`)) {
    return { ok: false as const, error: "You cannot attach this image." };
  }

  const post = await prisma.communityPost.create({
    data: {
      id: newId(),
      userId,
      text,
      imagePath: imagePath || null
    }
  });

  if (imagePath) {
    const promotedPath = await promoteCommunityImage(post.id, imagePath);
    if (promotedPath !== imagePath) {
      await prisma.communityPost.update({
        where: { id: post.id },
        data: {
          imagePath: promotedPath
        }
      });
    }
  }

  return { ok: true as const, post: (await getCommunityPostView(post.id, userId))! };
}

export async function toggleCommunityPostLike(postId: string, userId: string) {
  return setCommunityPostReaction(postId, userId, "LIKE");
}

export async function setCommunityPostReaction(postId: string, userId: string, reaction: "LIKE" | "LOVE") {
  const user = await canInteract(userId);
  if (!user) return { ok: false as const, error: "Login required." };
  const post = await prisma.communityPost.findUnique({
    where: { id: postId }
  });
  if (!post) return { ok: false as const, error: "Post not found." };

  const existing = await prisma.communityPostLike.findFirst({
    where: { postId, userId }
  });
  if (existing && existing.reaction === reaction) {
    await prisma.communityPostLike.delete({
      where: { id: existing.id }
    });
  } else if (existing) {
    await prisma.communityPostLike.update({
      where: { id: existing.id },
      data: { reaction }
    });
  } else {
    await prisma.communityPostLike.create({
      data: {
        id: newId(),
        postId,
        userId,
        reaction
      }
    });
  }

  return { ok: true as const, post: (await getCommunityPostView(postId, userId))! };
}

export async function addCommunityPostComment(
  postId: string,
  userId: string,
  textInput: string,
  parentCommentId?: string | null
) {
  const user = await canInteract(userId);
  if (!user) return { ok: false as const, error: "Login required." };
  const post = await prisma.communityPost.findUnique({
    where: { id: postId }
  });
  if (!post) return { ok: false as const, error: "Post not found." };

  const text = textInput.trim();
  if (!text) return { ok: false as const, error: "Comment is required." };
  if (text.length > 300) return { ok: false as const, error: "Comment must be 300 characters or less." };
  const parentId = (parentCommentId ?? "").trim();
  if (parentId) {
    const parent = await prisma.communityPostComment.findFirst({
      where: { id: parentId, postId }
    });
    if (!parent) return { ok: false as const, error: "Parent comment not found." };
  }

  await prisma.communityPostComment.create({
    data: {
      id: newId(),
      postId,
      userId,
      text,
      parentCommentId: parentId || null
    }
  });

  return { ok: true as const, post: (await getCommunityPostView(postId, userId))! };
}

export async function deleteCommunityPostComment(postId: string, commentId: string, userId: string) {
  const user = await canInteract(userId);
  if (!user) return { ok: false as const, error: "Login required." };
  const comment = await prisma.communityPostComment.findFirst({
    where: { id: commentId, postId }
  });
  if (!comment) return { ok: false as const, error: "Comment not found." };
  if (comment.userId !== userId && user.role !== "ADMIN") {
    return { ok: false as const, error: "You can only delete your own comment." };
  }

  const comments = await prisma.communityPostComment.findMany({
    where: { postId }
  });
  const toDelete = new Set<string>([commentId]);
  while (true) {
    const before = toDelete.size;
    for (const item of comments) {
      if (item.parentCommentId && toDelete.has(item.parentCommentId)) toDelete.add(item.id);
    }
    if (toDelete.size === before) break;
  }

  await prisma.$transaction([
    prisma.communityPostCommentLike.deleteMany({
      where: { commentId: { in: Array.from(toDelete) } }
    }),
    prisma.communityPostComment.deleteMany({
      where: { id: { in: Array.from(toDelete) } }
    })
  ]);

  return { ok: true as const, post: (await getCommunityPostView(postId, userId))! };
}

export async function toggleCommunityPostCommentLike(postId: string, commentId: string, userId: string) {
  const user = await canInteract(userId);
  if (!user) return { ok: false as const, error: "Login required." };
  const comment = await prisma.communityPostComment.findFirst({
    where: { id: commentId, postId }
  });
  if (!comment) return { ok: false as const, error: "Comment not found." };

  const existing = await prisma.communityPostCommentLike.findFirst({
    where: { postId, commentId, userId }
  });
  if (existing) {
    await prisma.communityPostCommentLike.delete({
      where: { id: existing.id }
    });
  } else {
    await prisma.communityPostCommentLike.create({
      data: {
        id: newId(),
        postId,
        commentId,
        userId
      }
    });
  }

  return { ok: true as const, post: (await getCommunityPostView(postId, userId))! };
}

export async function toggleCommunityListingLike(listingId: string, userId: string) {
  const user = await canInteract(userId);
  if (!user) return { ok: false as const, error: "Login required." };
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, status: "APPROVED", soldAt: null }
  });
  if (!listing) return { ok: false as const, error: "Listing not found." };

  const existing = await prisma.communityListingLike.findFirst({
    where: { listingId, userId }
  });
  if (existing) {
    await prisma.communityListingLike.delete({
      where: { id: existing.id }
    });
  } else {
    await prisma.communityListingLike.create({
      data: {
        id: newId(),
        listingId,
        userId
      }
    });
  }

  return { ok: true as const, listing: (await getCommunityListingView(listingId, userId))! };
}

export async function addCommunityListingComment(
  listingId: string,
  userId: string,
  textInput: string,
  parentCommentId?: string | null
) {
  const user = await canInteract(userId);
  if (!user) return { ok: false as const, error: "Login required." };
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, status: "APPROVED", soldAt: null }
  });
  if (!listing) return { ok: false as const, error: "Listing not found." };

  const text = textInput.trim();
  if (!text) return { ok: false as const, error: "Comment is required." };
  if (text.length > 300) return { ok: false as const, error: "Comment must be 300 characters or less." };
  const parentId = (parentCommentId ?? "").trim();
  if (parentId) {
    const parent = await prisma.communityListingComment.findFirst({
      where: { id: parentId, listingId }
    });
    if (!parent) return { ok: false as const, error: "Parent comment not found." };
  }

  await prisma.communityListingComment.create({
    data: {
      id: newId(),
      listingId,
      userId,
      text,
      parentCommentId: parentId || null
    }
  });

  return { ok: true as const, listing: (await getCommunityListingView(listingId, userId))! };
}

export async function deleteCommunityListingComment(listingId: string, commentId: string, userId: string) {
  const user = await canInteract(userId);
  if (!user) return { ok: false as const, error: "Login required." };
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, status: "APPROVED", soldAt: null },
    select: { id: true }
  });
  if (!listing) return { ok: false as const, error: "Listing not found." };
  const comment = await prisma.communityListingComment.findFirst({
    where: { id: commentId, listingId }
  });
  if (!comment) return { ok: false as const, error: "Comment not found." };
  if (comment.userId !== userId && user.role !== "ADMIN") {
    return { ok: false as const, error: "You can only delete your own comment." };
  }

  const comments = await prisma.communityListingComment.findMany({
    where: { listingId }
  });
  const toDelete = new Set<string>([commentId]);
  while (true) {
    const before = toDelete.size;
    for (const item of comments) {
      if (item.parentCommentId && toDelete.has(item.parentCommentId)) toDelete.add(item.id);
    }
    if (toDelete.size === before) break;
  }

  await prisma.$transaction([
    prisma.communityListingCommentLike.deleteMany({
      where: { commentId: { in: Array.from(toDelete) } }
    }),
    prisma.communityListingComment.deleteMany({
      where: { id: { in: Array.from(toDelete) } }
    })
  ]);

  return { ok: true as const, listing: (await getCommunityListingView(listingId, userId))! };
}

export async function toggleCommunityListingCommentLike(listingId: string, commentId: string, userId: string) {
  const user = await canInteract(userId);
  if (!user) return { ok: false as const, error: "Login required." };
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, status: "APPROVED", soldAt: null },
    select: { id: true }
  });
  if (!listing) return { ok: false as const, error: "Listing not found." };
  const comment = await prisma.communityListingComment.findFirst({
    where: { id: commentId, listingId }
  });
  if (!comment) return { ok: false as const, error: "Comment not found." };

  const existing = await prisma.communityListingCommentLike.findFirst({
    where: { listingId, commentId, userId }
  });
  if (existing) {
    await prisma.communityListingCommentLike.delete({
      where: { id: existing.id }
    });
  } else {
    await prisma.communityListingCommentLike.create({
      data: {
        id: newId(),
        listingId,
        commentId,
        userId
      }
    });
  }

  return { ok: true as const, listing: (await getCommunityListingView(listingId, userId))! };
}

"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { deleteUploadedPath, uploadFiles } from "@/lib/client/uploads";
import { LoginRequiredModal } from "@/components/auth/login-required-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CommentView = {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string | null };
  canDelete: boolean;
  replies?: CommentView[];
  repliesCount?: number;
  likesCount?: number;
  likedByViewer?: boolean;
};

type PostView = {
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
  comments: CommentView[];
};

type ListingView = {
  listingId: string;
  propertyId: string;
  title: string;
  description: string;
  imageUrl?: string;
  city: string;
  area: string;
  district: string;
  transaction: "BUY" | "RENT" | "VACATION";
  createdAt: string;
  updatedAt: string;
  seller: { id: string; name: string; avatarUrl?: string | null; isDeveloper: boolean };
  likesCount: number;
  likedByViewer: boolean;
  commentsCount: number;
  comments: CommentView[];
};

type Viewer = {
  id: string;
  role: "BUYER" | "SELLER" | "ADMIN";
  canCreatePost: boolean;
} | null;

export function CommunityFeed({
  initialPosts,
  listings,
  viewer,
  focus
}: {
  initialPosts: PostView[];
  listings: ListingView[];
  viewer: Viewer;
  focus?: { kind: "post" | "listing"; id: string; commentId?: string } | null;
}) {
  function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "U";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (a + b).toUpperCase();
  }

  function Avatar({ user, size = 28 }: { user: { name: string; avatarUrl?: string | null }; size?: number }) {
    const px = `${size}px`;
    return (
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100"
        style={{ width: px, height: px }}
        aria-label={`${user.name} avatar`}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-brand-800">{initials(user.name)}</span>
        )}
      </div>
    );
  }

  const [posts, setPosts] = useState<PostView[]>(initialPosts);
  const [listingItems, setListingItems] = useState<ListingView[]>(listings);
  const [postText, setPostText] = useState("");
  const [postImagePath, setPostImagePath] = useState("");
  const [postError, setPostError] = useState("");
  const [postLoading, setPostLoading] = useState(false);
  const [postImageLoading, setPostImageLoading] = useState(false);
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);
  const [commentLoadingId, setCommentLoadingId] = useState<string | null>(null);
  const [commentByPostId, setCommentByPostId] = useState<Record<string, string>>({});
  const [deletePostCommentLoadingId, setDeletePostCommentLoadingId] = useState<string | null>(null);
  const [openPostReplyForCommentId, setOpenPostReplyForCommentId] = useState<string | null>(null);
  const [replyByPostCommentId, setReplyByPostCommentId] = useState<Record<string, string>>({});
  const [replyPostCommentLoadingId, setReplyPostCommentLoadingId] = useState<string | null>(null);
  const [expandedPostReplies, setExpandedPostReplies] = useState<Record<string, boolean>>({});
  const [listingLikeLoadingId, setListingLikeLoadingId] = useState<string | null>(null);
  const [listingCommentLoadingId, setListingCommentLoadingId] = useState<string | null>(null);
  const [commentByListingId, setCommentByListingId] = useState<Record<string, string>>({});
  const [deleteListingCommentLoadingId, setDeleteListingCommentLoadingId] = useState<string | null>(null);
  const [openListingReplyForCommentId, setOpenListingReplyForCommentId] = useState<string | null>(null);
  const [replyByListingCommentId, setReplyByListingCommentId] = useState<Record<string, string>>({});
  const [replyListingCommentLoadingId, setReplyListingCommentLoadingId] = useState<string | null>(null);
  const [expandedListingReplies, setExpandedListingReplies] = useState<Record<string, boolean>>({});
  const [expandedPostComments, setExpandedPostComments] = useState<Record<string, boolean>>({});
  const [expandedListingComments, setExpandedListingComments] = useState<Record<string, boolean>>({});
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  const [likedPostIds, setLikedPostIds] = useState<Record<string, boolean>>({});
  const [likedListingIds, setLikedListingIds] = useState<Record<string, boolean>>({});

  const COMMENTS_PREVIEW_COUNT = 3;

  function buildParentMap(comments: CommentView[]) {
    const map = new Map<string, string>();
    const walk = (items: CommentView[]) => {
      for (const item of items) {
        const replies = item.replies ?? [];
        for (const child of replies) {
          map.set(child.id, item.id);
        }
        if (replies.length) walk(replies);
      }
    };
    walk(comments);
    return map;
  }

  useEffect(() => {
    if (!focus?.id) return;

    const containerId = focus.kind === "post" ? `community-post-${focus.id}` : `community-listing-${focus.id}`;
    const container = document.getElementById(containerId);
    container?.scrollIntoView({ block: "start", behavior: "smooth" });

    if (!focus.commentId) return;

    if (focus.kind === "post") {
      setExpandedPostComments((prev) => ({ ...prev, [focus.id]: true }));
    } else {
      setExpandedListingComments((prev) => ({ ...prev, [focus.id]: true }));
    }

    if (focus.kind === "post") {
      const post = posts.find((p) => p.id === focus.id);
      if (post) {
        const parents = buildParentMap(post.comments);
        const toExpand: string[] = [];
        let cursor = focus.commentId;
        while (parents.has(cursor)) {
          const parentId = parents.get(cursor)!;
          toExpand.push(parentId);
          cursor = parentId;
        }
        if (toExpand.length) {
          setExpandedPostReplies((prev) => {
            const next = { ...prev };
            toExpand.forEach((id) => {
              next[id] = true;
            });
            return next;
          });
        }
      }
    } else {
      const listing = listingItems.find((l) => l.listingId === focus.id);
      if (listing) {
        const parents = buildParentMap(listing.comments);
        const toExpand: string[] = [];
        let cursor = focus.commentId;
        while (parents.has(cursor)) {
          const parentId = parents.get(cursor)!;
          toExpand.push(parentId);
          cursor = parentId;
        }
        if (toExpand.length) {
          setExpandedListingReplies((prev) => {
            const next = { ...prev };
            toExpand.forEach((id) => {
              next[id] = true;
            });
            return next;
          });
        }
      }
    }

    window.setTimeout(() => {
      const commentEl = document.getElementById(`community-comment-${focus.commentId}`);
      commentEl?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
  }, [focus, listingItems, posts]);

  const postLikesStorageKey = viewer ? `ck:community:post-likes:${viewer.id}` : "";
  const listingLikesStorageKey = viewer ? `ck:community:listing-likes:${viewer.id}` : "";

  useEffect(() => {
    if (!viewer) {
      setLikedPostIds({});
      setLikedListingIds({});
      return;
    }
    try {
      const postRaw = localStorage.getItem(postLikesStorageKey);
      const listingRaw = localStorage.getItem(listingLikesStorageKey);
      const parsedPosts = postRaw ? JSON.parse(postRaw) : null;
      const parsedListings = listingRaw ? JSON.parse(listingRaw) : null;
      const postIds = Array.isArray(parsedPosts) ? (parsedPosts as string[]) : [];
      const listingIds = Array.isArray(parsedListings) ? (parsedListings as string[]) : [];
      setLikedPostIds(Object.fromEntries(postIds.map((id) => [id, true])));
      setLikedListingIds(Object.fromEntries(listingIds.map((id) => [id, true])));
    } catch {
      setLikedPostIds({});
      setLikedListingIds({});
    }
  }, [viewer, postLikesStorageKey, listingLikesStorageKey]);

  function setPersistedPostLike(postId: string, liked: boolean) {
    if (!viewer) return;
    setLikedPostIds((prev) => {
      const next = { ...prev };
      if (liked) next[postId] = true;
      else delete next[postId];
      localStorage.setItem(postLikesStorageKey, JSON.stringify(Object.keys(next)));
      return next;
    });
  }

  function setPersistedListingLike(listingId: string, liked: boolean) {
    if (!viewer) return;
    setLikedListingIds((prev) => {
      const next = { ...prev };
      if (liked) next[listingId] = true;
      else delete next[listingId];
      localStorage.setItem(listingLikesStorageKey, JSON.stringify(Object.keys(next)));
      return next;
    });
  }

  function isPostLiked(post: PostView) {
    return post.reactionByViewer === "LIKE" || Boolean(likedPostIds[post.id]);
  }

  function isListingLiked(listing: ListingView) {
    return listing.likedByViewer || Boolean(likedListingIds[listing.listingId]);
  }

  function upsertPost(post: PostView) {
    setPosts((prev) => {
      const idx = prev.findIndex((x) => x.id === post.id);
      if (idx === -1) return [post, ...prev];
      const next = [...prev];
      next[idx] = post;
      return next;
    });
  }

  function upsertListing(item: ListingView) {
    setListingItems((prev) => {
      const idx = prev.findIndex((x) => x.listingId === item.listingId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = item;
      return next;
    });
  }

  async function onPickPostImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostError("");
    setPostImageLoading(true);
    try {
      const [uploaded] = await uploadFiles("community", [file]);
      if (!uploaded) return;
      if (postImagePath.startsWith("/uploads/tmp/")) {
        await deleteUploadedPath(postImagePath).catch(() => undefined);
      }
      setPostImagePath(uploaded.path);
    } catch (uploadError) {
      setPostError(uploadError instanceof Error ? uploadError.message : "Could not upload image.");
    } finally {
      setPostImageLoading(false);
      e.target.value = "";
    }
  }

  async function removePostImage() {
    const previousPath = postImagePath;
    setPostImagePath("");
    if (previousPath.startsWith("/uploads/tmp/")) {
      await deleteUploadedPath(previousPath).catch(() => undefined);
    }
  }

  async function createPost() {
    if (!viewer?.canCreatePost) {
      setShowLoginRequired(true);
      return;
    }
    setPostLoading(true);
    setPostError("");
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: postText, imagePath: postImagePath })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPostError(String(data?.error ?? "Failed to create post."));
        return;
      }
      upsertPost(data.post);
      setPostText("");
      setPostImagePath("");
    } finally {
      setPostLoading(false);
    }
  }

  async function reactToPost(postId: string, reaction: "LIKE" | "LOVE") {
    if (!viewer) {
      setShowLoginRequired(true);
      return;
    }
    setLikeLoadingId(postId);
    try {
      const res = await fetch(`/api/community/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.post) {
        upsertPost(data.post);
        setPersistedPostLike(postId, data.post.reactionByViewer === "LIKE");
      }
    } finally {
      setLikeLoadingId(null);
    }
  }

  async function addComment(postId: string, e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (!viewer) {
      setShowLoginRequired(true);
      return;
    }
    const text = String(commentByPostId[postId] ?? "").trim();
    if (!text) return;
    setCommentLoadingId(postId);
    try {
      const res = await fetch(`/api/community/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.post) {
        upsertPost(data.post);
        setCommentByPostId((prev) => ({ ...prev, [postId]: "" }));
      }
    } finally {
      setCommentLoadingId(null);
    }
  }

  async function addPostReply(postId: string, parentCommentId: string, e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (!viewer) {
      setShowLoginRequired(true);
      return;
    }
    const text = String(replyByPostCommentId[parentCommentId] ?? "").trim();
    if (!text) return;
    setReplyPostCommentLoadingId(parentCommentId);
    try {
      const res = await fetch(`/api/community/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, parentCommentId })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.post) {
        upsertPost(data.post);
        setReplyByPostCommentId((prev) => ({ ...prev, [parentCommentId]: "" }));
        setOpenPostReplyForCommentId(null);
      }
    } finally {
      setReplyPostCommentLoadingId(null);
    }
  }

  async function likeListing(listingId: string) {
    if (!viewer) {
      setShowLoginRequired(true);
      return;
    }
    setListingLikeLoadingId(listingId);
    try {
      const res = await fetch(`/api/community/listings/${listingId}/like`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.listing) {
        upsertListing(data.listing);
        setPersistedListingLike(listingId, Boolean(data.listing.likedByViewer));
      }
    } finally {
      setListingLikeLoadingId(null);
    }
  }

  async function addListingComment(listingId: string, e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (!viewer) {
      setShowLoginRequired(true);
      return;
    }
    const text = String(commentByListingId[listingId] ?? "").trim();
    if (!text) return;
    setListingCommentLoadingId(listingId);
    try {
      const res = await fetch(`/api/community/listings/${listingId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.listing) {
        upsertListing(data.listing);
        setCommentByListingId((prev) => ({ ...prev, [listingId]: "" }));
      }
    } finally {
      setListingCommentLoadingId(null);
    }
  }

  async function addListingReply(listingId: string, parentCommentId: string, e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (!viewer) {
      setShowLoginRequired(true);
      return;
    }
    const text = String(replyByListingCommentId[parentCommentId] ?? "").trim();
    if (!text) return;
    setReplyListingCommentLoadingId(parentCommentId);
    try {
      const res = await fetch(`/api/community/listings/${listingId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, parentCommentId })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.listing) {
        upsertListing(data.listing);
        setReplyByListingCommentId((prev) => ({ ...prev, [parentCommentId]: "" }));
        setOpenListingReplyForCommentId(null);
      }
    } finally {
      setReplyListingCommentLoadingId(null);
    }
  }

  async function deletePostComment(postId: string, commentId: string) {
    if (!viewer) {
      setShowLoginRequired(true);
      return;
    }
    setDeletePostCommentLoadingId(commentId);
    try {
      const res = await fetch(`/api/community/${postId}/comment/${commentId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.post) upsertPost(data.post);
    } finally {
      setDeletePostCommentLoadingId(null);
    }
  }

  async function deleteListingComment(listingId: string, commentId: string) {
    if (!viewer) {
      setShowLoginRequired(true);
      return;
    }
    setDeleteListingCommentLoadingId(commentId);
    try {
      const res = await fetch(`/api/community/listings/${listingId}/comment/${commentId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.listing) upsertListing(data.listing);
    } finally {
      setDeleteListingCommentLoadingId(null);
    }
  }

  async function likePostComment(postId: string, commentId: string) {
    if (!viewer) {
      setShowLoginRequired(true);
      return;
    }
    setDeletePostCommentLoadingId(commentId);
    try {
      const res = await fetch(`/api/community/${postId}/comment/${commentId}/like`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.post) upsertPost(data.post);
    } finally {
      setDeletePostCommentLoadingId(null);
    }
  }

  async function likeListingComment(listingId: string, commentId: string) {
    if (!viewer) {
      setShowLoginRequired(true);
      return;
    }
    setDeleteListingCommentLoadingId(commentId);
    try {
      const res = await fetch(`/api/community/listings/${listingId}/comment/${commentId}/like`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.listing) upsertListing(data.listing);
    } finally {
      setDeleteListingCommentLoadingId(null);
    }
  }

  function renderPostComment(postId: string, comment: CommentView) {
    const repliesCount = comment.repliesCount ?? comment.replies?.length ?? 0;
    const isExpanded = Boolean(expandedPostReplies[comment.id]);
    return (
      <div key={comment.id} id={`community-comment-${comment.id}`} className="rounded-xl bg-slate-100 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar user={comment.user} size={22} />
            <p className="truncate text-xs font-semibold text-slate-700">
              {comment.user.name} | {new Date(comment.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => likePostComment(postId, comment.id)}
              disabled={deletePostCommentLoadingId === comment.id}
              className={`text-xs font-semibold disabled:opacity-60 ${
                comment.likedByViewer ? "text-red-600 hover:bg-red-50" : "text-slate-600 hover:bg-slate-200"
              } rounded px-2 py-1`}
              aria-label={comment.likedByViewer ? "Unlike comment" : "Like comment"}
            >
              {comment.likedByViewer ? "❤" : "♡"} {comment.likesCount?.toLocaleString() ?? 0}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!viewer) {
                  setShowLoginRequired(true);
                  return;
                }
                setOpenPostReplyForCommentId((prev) => (prev === comment.id ? null : comment.id));
              }}
              className="text-xs font-semibold text-slate-600 hover:underline"
            >
              Reply
            </button>
            {comment.canDelete ? (
              <button
                type="button"
                onClick={() => deletePostComment(postId, comment.id)}
                disabled={deletePostCommentLoadingId === comment.id}
                className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
        <p className="text-sm text-slate-800">{comment.text}</p>

        {repliesCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpandedPostReplies((prev) => ({ ...prev, [comment.id]: !Boolean(prev[comment.id]) }))}
            className="mt-1 text-xs font-semibold text-brand-700 hover:underline"
          >
            {isExpanded ? "Hide replies" : `View replies (${repliesCount})`}
          </button>
        ) : null}

        {openPostReplyForCommentId === comment.id ? (
          <form className="mt-2 flex gap-2" onSubmit={(e) => addPostReply(postId, comment.id, e)}>
            <Input
              placeholder={viewer ? "Write a reply..." : "Log in to reply"}
              value={replyByPostCommentId[comment.id] ?? ""}
              onFocus={() => {
                if (!viewer) setShowLoginRequired(true);
              }}
              onChange={(e) => setReplyByPostCommentId((prev) => ({ ...prev, [comment.id]: e.target.value }))}
              readOnly={!viewer}
              className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
            />
            <Button
              type="submit"
              variant="outline"
              disabled={replyPostCommentLoadingId === comment.id}
              className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            >
              Reply
            </Button>
          </form>
        ) : null}

        {isExpanded && comment.replies?.length ? (
          <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
            {comment.replies.map((child) => renderPostComment(postId, child))}
          </div>
        ) : null}
      </div>
    );
  }

  function renderListingComment(listingId: string, comment: CommentView) {
    const repliesCount = comment.repliesCount ?? comment.replies?.length ?? 0;
    const isExpanded = Boolean(expandedListingReplies[comment.id]);
    return (
      <div key={comment.id} id={`community-comment-${comment.id}`} className="rounded-xl bg-slate-100 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar user={comment.user} size={22} />
            <p className="truncate text-xs font-semibold text-slate-700">
              {comment.user.name} | {new Date(comment.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => likeListingComment(listingId, comment.id)}
              disabled={deleteListingCommentLoadingId === comment.id}
              className={`text-xs font-semibold disabled:opacity-60 ${
                comment.likedByViewer ? "text-red-600 hover:bg-red-50" : "text-slate-600 hover:bg-slate-200"
              } rounded px-2 py-1`}
              aria-label={comment.likedByViewer ? "Unlike comment" : "Like comment"}
            >
              {comment.likedByViewer ? "❤" : "♡"} {comment.likesCount?.toLocaleString() ?? 0}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!viewer) {
                  setShowLoginRequired(true);
                  return;
                }
                setOpenListingReplyForCommentId((prev) => (prev === comment.id ? null : comment.id));
              }}
              className="text-xs font-semibold text-slate-600 hover:underline"
            >
              Reply
            </button>
            {comment.canDelete ? (
              <button
                type="button"
                onClick={() => deleteListingComment(listingId, comment.id)}
                disabled={deleteListingCommentLoadingId === comment.id}
                className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
        <p className="text-sm text-slate-800">{comment.text}</p>

        {repliesCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpandedListingReplies((prev) => ({ ...prev, [comment.id]: !Boolean(prev[comment.id]) }))}
            className="mt-1 text-xs font-semibold text-brand-700 hover:underline"
          >
            {isExpanded ? "Hide replies" : `View replies (${repliesCount})`}
          </button>
        ) : null}

        {openListingReplyForCommentId === comment.id ? (
          <form className="mt-2 flex gap-2" onSubmit={(e) => addListingReply(listingId, comment.id, e)}>
            <Input
              placeholder={viewer ? "Write a reply..." : "Log in to reply"}
              value={replyByListingCommentId[comment.id] ?? ""}
              onFocus={() => {
                if (!viewer) setShowLoginRequired(true);
              }}
              onChange={(e) => setReplyByListingCommentId((prev) => ({ ...prev, [comment.id]: e.target.value }))}
              readOnly={!viewer}
              className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
            />
            <Button
              type="submit"
              variant="outline"
              disabled={replyListingCommentLoadingId === comment.id}
              className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            >
              Reply
            </Button>
          </form>
        ) : null}

        {isExpanded && comment.replies?.length ? (
          <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
            {comment.replies.map((child) => renderListingComment(listingId, child))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-4">
        {!focus || focus.kind !== "post" ? (
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">Latest Approved Listings</h2>
            {listingItems.length === 0 ? (
              <p className="text-sm text-slate-600">No approved listings yet.</p>
            ) : (
              <div className="space-y-3">
                {listingItems.map((listing) => (
                  <div key={listing.listingId} id={`community-listing-${listing.listingId}`} className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar user={listing.seller} size={28} />
                      <p className="text-sm font-semibold text-slate-900">
                        {listing.seller.name}{" "}
                        {listing.seller.isDeveloper ? <span className="text-xs font-normal text-slate-500">(Developer)</span> : null}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{listing.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {listing.transaction} | {listing.city}, {listing.area}, {listing.district}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">{listing.description}</p>
                  </div>
                  {listing.imageUrl ? <img src={listing.imageUrl} alt={listing.title} className="max-h-72 w-full border-y border-slate-200 object-cover" /> : null}
                  <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500">
                    <span>{listing.likesCount.toLocaleString()} likes</span>
                    <span>{listing.commentsCount.toLocaleString()} comments</span>
                  </div>
                  <div className="grid grid-cols-2 border-y border-slate-200">
                    <button
                      type="button"
                      onClick={() => likeListing(listing.listingId)}
                      disabled={listingLikeLoadingId === listing.listingId}
                      aria-label={isListingLiked(listing) ? "Unlike listing" : "Like listing"}
                      className={`px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
                        isListingLiked(listing)
                          ? "font-bold text-red-600 hover:bg-red-50"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {isListingLiked(listing) ? "❤" : "♡"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedListingComments((prev) => ({ ...prev, [listing.listingId]: true }));
                        const field = document.getElementById(`listing-comment-${listing.listingId}`) as HTMLInputElement | null;
                        field?.focus();
                        if (!viewer) setShowLoginRequired(true);
                      }}
                      className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Comment
                    </button>
                  </div>

                  {(() => {
                    const expanded = Boolean(expandedListingComments[listing.listingId]);
                    const visible = expanded ? listing.comments : listing.comments.slice(-COMMENTS_PREVIEW_COUNT);
                    return (
                      <div className="border-t border-slate-200 px-3 py-3">
                        {listing.comments.length > COMMENTS_PREVIEW_COUNT ? (
                          <button
                            type="button"
                            onClick={() => setExpandedListingComments((prev) => ({ ...prev, [listing.listingId]: !expanded }))}
                            className="mb-2 text-xs font-semibold text-brand-700 hover:underline"
                          >
                            {expanded ? "Hide comments" : `View all comments (${listing.commentsCount.toLocaleString()})`}
                          </button>
                        ) : null}

                        <div className="space-y-2">
                          {visible.map((comment) => renderListingComment(listing.listingId, comment))}
                        </div>

                        {expanded ? (
                          <form className="mt-3 flex gap-2" onSubmit={(e) => addListingComment(listing.listingId, e)}>
                            <Input
                              id={`listing-comment-${listing.listingId}`}
                              placeholder={viewer ? "Write a comment on this listing..." : "Log in to comment"}
                              value={commentByListingId[listing.listingId] ?? ""}
                              onFocus={() => {
                                if (!viewer) setShowLoginRequired(true);
                              }}
                              onChange={(e) => setCommentByListingId((prev) => ({ ...prev, [listing.listingId]: e.target.value }))}
                              readOnly={!viewer}
                            />
                            <Button type="submit" variant="outline" disabled={listingCommentLoadingId === listing.listingId}>
                              Comment
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2">
                    <p className="text-xs text-slate-500">Updated: {new Date(listing.updatedAt).toLocaleString()}</p>
                    <Link href={`/p/${listing.propertyId}`} className="text-xs font-semibold text-brand-700 hover:underline">
                      View Listing
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        ) : null}

        {viewer?.canCreatePost && !focus ? (
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">Create Post</h2>
            <Textarea
              placeholder="Share update, project, deal, or market news..."
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              maxLength={1000}
            />
            <div className="space-y-2">
              <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPickPostImage} disabled={postImageLoading} />
              <p className="text-xs text-slate-500">Optional image. JPG, PNG, or WebP only, up to 6MB.</p>
              {postImagePath ? (
                <div className="space-y-2">
                  <img src={postImagePath} alt="Post upload preview" className="max-h-64 w-full rounded-xl border border-slate-200 object-cover" />
                  <Button type="button" variant="outline" onClick={removePostImage} disabled={postImageLoading}>
                    Remove Image
                  </Button>
                </div>
              ) : null}
              {postImageLoading ? <p className="text-xs text-brand-700">Uploading image...</p> : null}
            </div>
            <Button type="button" onClick={createPost} disabled={postLoading || postImageLoading}>
              {postLoading ? "Posting..." : "Post to Community"}
            </Button>
            {postError ? <p className="text-xs text-red-600">{postError}</p> : null}
          </Card>
        ) : null}

        {posts.length === 0 ? null : (
          posts.map((post) => (
            <Card key={post.id} id={`community-post-${post.id}`} className="overflow-hidden border-slate-200 bg-white p-0 text-slate-900">
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar user={post.user} size={40} />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">
                        {post.user.name}
                        <span className="ml-1 text-brand-700"> - Follow</span>
                      </p>
                      {post.user.companyName ? <p className="truncate text-xs text-slate-600">{post.user.companyName}</p> : null}
                      <p className="text-xs text-slate-500">{new Date(post.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-full px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Post actions"
                  >
                    ...
                  </button>
                </div>
              </div>

              <div className="px-4 pb-3">
                <p className="whitespace-pre-wrap text-sm text-slate-800">{post.text}</p>
              </div>

              {post.imageUrl ? <img src={post.imageUrl} alt="Community post" className="max-h-[560px] w-full border-y border-slate-200 object-cover" /> : null}

              <div className="flex items-center justify-between px-4 py-2 text-sm text-slate-500">
                <span>{post.likesCount.toLocaleString()} reactions</span>
                <span>{post.commentsCount.toLocaleString()} comments</span>
              </div>

              <div className="grid grid-cols-2 border-y border-slate-200">
                <button
                  type="button"
                  onClick={() => reactToPost(post.id, "LIKE")}
                  disabled={likeLoadingId === post.id}
                  aria-label={isPostLiked(post) ? "Unlike post" : "Like post"}
                  className={`px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
                    isPostLiked(post)
                      ? "font-bold text-red-600 hover:bg-red-50"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {isPostLiked(post) ? "❤" : "♡"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpandedPostComments((prev) => ({ ...prev, [post.id]: true }));
                    const field = document.getElementById(`comment-${post.id}`) as HTMLInputElement | null;
                    field?.focus();
                    if (!viewer) setShowLoginRequired(true);
                  }}
                  className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Comment
                </button>
              </div>

              {(() => {
                const expanded = Boolean(expandedPostComments[post.id]);
                const visible = expanded ? post.comments : post.comments.slice(-COMMENTS_PREVIEW_COUNT);
                return (
                  <div className="border-t border-slate-200 px-4 py-3">
                    {post.comments.length > COMMENTS_PREVIEW_COUNT ? (
                      <button
                        type="button"
                        onClick={() => setExpandedPostComments((prev) => ({ ...prev, [post.id]: !expanded }))}
                        className="mb-2 text-xs font-semibold text-brand-700 hover:underline"
                      >
                        {expanded ? "Hide comments" : `View all comments (${post.commentsCount.toLocaleString()})`}
                      </button>
                    ) : null}

                    <div className="space-y-2">
                      {visible.map((comment) => renderPostComment(post.id, comment))}
                    </div>

                    {expanded ? (
                      <form className="mt-3 flex gap-2" onSubmit={(e) => addComment(post.id, e)}>
                        <Input
                          id={`comment-${post.id}`}
                          placeholder={viewer ? "Write a comment..." : "Log in to comment"}
                          value={commentByPostId[post.id] ?? ""}
                          onFocus={() => {
                            if (!viewer) setShowLoginRequired(true);
                          }}
                          onChange={(e) => setCommentByPostId((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          readOnly={!viewer}
                          className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
                        />
                        <Button
                          type="submit"
                          variant="outline"
                          disabled={commentLoadingId === post.id}
                          className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                        >
                          Comment
                        </Button>
                      </form>
                    ) : null}
                  </div>
                );
              })()}
            </Card>
          ))
        )}
      </div>
      <LoginRequiredModal open={showLoginRequired} onClose={() => setShowLoginRequired(false)} />
    </>
  );
}

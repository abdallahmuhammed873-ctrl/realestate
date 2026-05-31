"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPropertyCoverImage } from "@/lib/property-images";
import type { ListingStatus, Property, User } from "@/lib/types";

type AdminTextPost = {
  post: {
    id: string;
    userId: string;
    text: string;
    imageUrl?: string | null;
    imagePath?: string | null;
    createdAt: string;
    updatedAt: string;
    likesCount?: number;
    commentsCount?: number;
  };
  author: User | null;
};

type AdminListingPost = {
  listing: {
    id: string;
    userId: string;
    status: ListingStatus;
    updatedAt: string;
    createdAt: string;
  };
  property: Property;
  seller: User | null;
  company: User | null;
  likesCount: number;
  commentsCount: number;
};

type CommunityItem =
  | {
      kind: "listing";
      id: string;
      sortDate: string;
      item: AdminListingPost;
    }
  | {
      kind: "post";
      id: string;
      sortDate: string;
      item: AdminTextPost;
    };

function StatusBadge({ status }: { status: ListingStatus }) {
  if (status === "APPROVED") return <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Approved</span>;
  if (status === "REJECTED") return <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Rejected</span>;
  if (status === "PENDING") return <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Pending</span>;
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Draft</span>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function AdminCommunityPostsManager({
  initialPosts,
  initialListingPosts
}: {
  initialPosts: AdminTextPost[];
  initialListingPosts: AdminListingPost[];
}) {
  const router = useRouter();
  const initialItems = useMemo<CommunityItem[]>(
    () =>
      [
        ...initialListingPosts.map((item) => ({
          kind: "listing" as const,
          id: item.listing.id,
          sortDate: item.listing.updatedAt,
          item
        })),
        ...initialPosts.map((item) => ({
          kind: "post" as const,
          id: item.post.id,
          sortDate: item.post.createdAt,
          item
        }))
      ].sort((a, b) => Date.parse(b.sortDate) - Date.parse(a.sortDate)),
    [initialListingPosts, initialPosts]
  );
  const [items, setItems] = useState<CommunityItem[]>(initialItems);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteItem(item: CommunityItem) {
    const message =
      item.kind === "listing"
        ? "Delete this community property post? This removes the related property from the entire website."
        : "Delete this community post?";
    if (!confirm(message)) return;

    setDeletingId(item.id);
    try {
      const endpoint =
        item.kind === "listing"
          ? `/api/admin/community/listings/${item.item.listing.id}`
          : `/api/admin/community/posts/${item.item.post.id}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(String(data?.error ?? "Could not delete community post."));
        return;
      }
      setItems((prev) => prev.filter((entry) => !(entry.kind === item.kind && entry.id === item.id)));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Community Posts</h2>
        <p className="text-xs text-slate-500">{items.length.toLocaleString()} total</p>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">No community posts found.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((entry) => {
            if (entry.kind === "listing") {
              const { listing, property, seller, company, likesCount, commentsCount } = entry.item;
              const imageUrl = getPropertyCoverImage(property.images, property.media);
              return (
                <li key={`listing-${entry.id}`} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <img src={imageUrl} alt={property.title} className="h-28 w-full rounded-xl border border-slate-200 object-cover md:w-40" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-800">Property post</span>
                        <StatusBadge status={listing.status} />
                        <span className="text-xs text-slate-500">Updated {formatDate(listing.updatedAt)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{property.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-700">{property.description}</p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {property.transaction} | {property.city}, {property.area}, {property.district}
                      </p>
                      <p className="text-xs text-slate-500">
                        Posted by {seller?.name ?? listing.userId}
                        {company ? ` (Company: ${company.name})` : ""}
                      </p>
                      <p className="text-xs text-slate-500">
                        {likesCount.toLocaleString()} likes | {commentsCount.toLocaleString()} comments
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <Link href={`/community?listing=${encodeURIComponent(listing.id)}`} className="text-sm font-semibold text-brand-700 hover:underline">
                          Open post
                        </Link>
                        <Link href={`/admin/listings/${listing.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
                          Review
                        </Link>
                        <Button type="button" variant="danger" onClick={() => void deleteItem(entry)} disabled={deletingId === entry.id} className="px-3 py-1.5">
                          {deletingId === entry.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            }

            const { post, author } = entry.item;
            return (
              <li key={`post-${entry.id}`} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-col gap-3 md:flex-row">
                  {post.imageUrl ? <img src={post.imageUrl} alt="Community post" className="h-28 w-full rounded-xl border border-slate-200 object-cover md:w-40" /> : null}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Text post</span>
                      <span className="text-xs text-slate-500">{formatDate(post.createdAt)}</span>
                    </div>
                    <p className="line-clamp-3 text-sm text-slate-700">{post.text}</p>
                    <p className="text-xs text-slate-500">Posted by {author?.name ?? post.userId}</p>
                    <p className="text-xs text-slate-500">
                      {(post.likesCount ?? 0).toLocaleString()} reactions | {(post.commentsCount ?? 0).toLocaleString()} comments
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Link href={`/community?post=${encodeURIComponent(post.id)}`} className="text-sm font-semibold text-brand-700 hover:underline">
                        Open post
                      </Link>
                      <Button type="button" variant="danger" onClick={() => void deleteItem(entry)} disabled={deletingId === entry.id} className="px-3 py-1.5">
                        {deletingId === entry.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

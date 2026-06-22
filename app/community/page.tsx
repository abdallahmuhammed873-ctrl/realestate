import { CommunityFeed } from "@/components/community/community-feed";
import { getCurrentUser } from "@/lib/auth";
import { listCommunityListings, listCommunityPosts } from "@/lib/repository";

export default async function CommunityPage({
  searchParams
}: {
  searchParams: Promise<{ post?: string; listing?: string; comment?: string }>;
}) {
  const user = await getCurrentUser();
  const resolved = await searchParams;
  const focusPostId = (resolved.post ?? "").trim();
  const focusListingId = (resolved.listing ?? "").trim();
  const focusCommentId = (resolved.comment ?? "").trim();

  const allPosts = await listCommunityPosts(user?.id);
  const allListings = await listCommunityListings(user?.id);
  const posts = focusListingId ? [] : focusPostId ? allPosts.filter((p) => p.id === focusPostId) : allPosts;
  const listings = focusPostId
    ? []
    : focusListingId
      ? allListings.filter((l) => l.listingId === focusListingId)
      : allListings;

  const focus =
    focusPostId || focusListingId
      ? {
          kind: focusPostId ? ("post" as const) : ("listing" as const),
          id: focusPostId || focusListingId,
          commentId: focusCommentId || undefined
        }
      : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Community</h1>
      <CommunityFeed
        initialPosts={posts}
        listings={listings}
        focus={focus}
        postsRefreshUrl={!focus ? "/api/community" : undefined}
        viewer={
          user
            ? {
                id: user.id,
                role: user.role,
                canCreatePost: user.role === "SELLER"
              }
            : null
        }
      />
    </div>
  );
}

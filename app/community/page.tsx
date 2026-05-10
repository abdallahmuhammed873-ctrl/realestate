import { CommunityFeed } from "@/components/community/community-feed";
import { getCurrentUser } from "@/lib/auth";
import { listCommunityListings, listCommunityPosts } from "@/lib/repository";

export default async function CommunityPage() {
  const user = await getCurrentUser();
  const posts = listCommunityPosts(user?.id);
  const listings = listCommunityListings(user?.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Community</h1>
      <CommunityFeed
        initialPosts={posts}
        listings={listings}
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

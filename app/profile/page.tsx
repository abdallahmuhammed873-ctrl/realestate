import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserById,
  listSellerCommunityListings,
  listSellerCommunityPosts
} from "@/lib/repository";
import { ProfileClient } from "@/app/profile/profile-client";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  const companyOwner = user.companyOwnerId ? await getUserById(user.companyOwnerId) : null;
  const companyName = companyOwner?.name ?? (user.isCompanyAccount ? user.name : undefined);

  const [communityPosts, communityListings] =
    user.role === "SELLER"
      ? await Promise.all([listSellerCommunityPosts(user.id, user.id), listSellerCommunityListings(user.id, user.id)])
      : [[], []];

  return (
    <ProfileClient
      user={{ ...user, companyName }}
      communityPosts={communityPosts}
      communityListings={communityListings}
    />
  );
}

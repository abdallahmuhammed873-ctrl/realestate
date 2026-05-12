import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserById, listSellerDashboard } from "@/lib/repository";
import { ProfileClient } from "@/app/profile/profile-client";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  const companyOwner = user.companyOwnerId ? await getUserById(user.companyOwnerId) : null;
  const companyName = companyOwner?.name ?? (user.isCompanyAccount ? user.name : undefined);

  const sellerListings =
    user.role === "SELLER"
      ? (await listSellerDashboard(user.id))
          .detailed.filter((x) => Boolean(x.property))
          .map(({ listing, property, seller }) => ({
            listingId: listing.id,
            status: listing.status,
            title: property!.title,
            description: property!.description,
            imageUrl: property!.images[0] ?? "",
            updatedAt: listing.updatedAt,
            createdByName: seller?.name ?? "Seller",
            isCompanyUser: Boolean(seller?.companyOwnerId)
          }))
      : [];

  return <ProfileClient user={{ ...user, companyName }} sellerListings={sellerListings} />;
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { CommunityFeed } from "@/components/community/community-feed";
import { getCurrentUser } from "@/lib/auth";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { listSellerCompanyCommunityListings, listSellerCompanyCommunityPosts } from "@/lib/repository";

export default async function CompanyPostsPage() {
  const [user, language] = await Promise.all([getCurrentUser(), getRequestLanguage()]);
  if (!user) redirect("/auth");

  const hasCompanyPostsAccess = user.role === "SELLER" && Boolean(user.companyOwnerId || user.isCompanyAccount);
  if (!hasCompanyPostsAccess) redirect("/profile");

  const [posts, listings] = await Promise.all([
    listSellerCompanyCommunityPosts(user.id, user.id),
    listSellerCompanyCommunityListings(user.id, user.id)
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-[var(--ink)]">{t(language, "companyPosts")}</h1>
        <Link
          href="/profile"
          className="inline-flex items-center justify-center rounded-xl border theme-divider bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] shadow-sm transition hover:bg-[var(--surface-soft)]"
        >
          {t(language, "backToProfile")}
        </Link>
      </div>

      <CommunityFeed
        initialPosts={posts}
        listings={listings}
        viewer={{ id: user.id, role: user.role, canCreatePost: true }}
        showListings
        showCreatePost={false}
        showAuthorRole
        listingSectionTitle={t(language, "propertyPosts")}
        emptyListingsMessage={null}
        emptyPostsMessage={t(language, "noCompanyPostsYet")}
        postsRefreshUrl={`/api/community/users/${encodeURIComponent(user.id)}/company-posts`}
      />
    </div>
  );
}

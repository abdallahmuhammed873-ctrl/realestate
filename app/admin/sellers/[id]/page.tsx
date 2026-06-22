import Link from "next/link";
import { redirect } from "next/navigation";
import { CommunityFeed } from "@/components/community/community-feed";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getLanguageDirection, t } from "@/lib/i18n";
import { getRequestLanguage } from "@/lib/i18n-server";
import { getUserById, listSellerCommunityListings, listSellerCommunityPosts, listSellerListingsForAdmin } from "@/lib/repository";

function StatusBadge({ status }: { status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" }) {
  if (status === "APPROVED") return <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Approved</span>;
  if (status === "REJECTED") return <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Rejected</span>;
  if (status === "PENDING") return <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Pending</span>;
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Draft</span>;
}

export default async function AdminSellerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const language = await getRequestLanguage();
  const direction = getLanguageDirection(language);
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/auth");
  const { id } = await params;

  const seller = await getUserById(id);
  if (!seller || seller.role !== "SELLER" || seller.isCompanyAccount || seller.companyOwnerId) redirect("/admin/sellers");

  const listings = await listSellerListingsForAdmin(seller.id);
  const [posts, communityListings] = await Promise.all([
    listSellerCommunityPosts(seller.id, user.id),
    listSellerCommunityListings(seller.id, user.id)
  ]);

  const byStatus = {
    total: listings.length,
    approved: listings.filter((x) => x.listing.status === "APPROVED").length,
    pending: listings.filter((x) => x.listing.status === "PENDING").length,
    rejected: listings.filter((x) => x.listing.status === "REJECTED").length
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{seller.name}</h1>
          <p className="text-sm text-slate-600">{seller.email}</p>
          <p className="text-sm text-slate-600">{seller.phone ?? "No phone provided"}</p>
        </div>
        <Link href="/admin/sellers" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-800">
          Back to Seller Profiles
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-2xl font-bold">{byStatus.total}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Approved</p>
          <p className="text-2xl font-bold">{byStatus.approved}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Pending</p>
          <p className="text-2xl font-bold">{byStatus.pending}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Rejected</p>
          <p className="text-2xl font-bold">{byStatus.rejected}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-bold">Listings</h2>
        {listings.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No listings found.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className={`${direction === "rtl" ? "text-right" : "text-left"} text-xs text-slate-500`}>
                  <th className="px-3">Status</th>
                  <th className="px-3">Title</th>
                  <th className="px-3">Uploaded By</th>
                  <th className="px-3">Updated</th>
                  <th className="px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map(({ listing, property, seller: uploader, company }) => (
                  <tr key={listing.id} className="rounded-xl bg-white">
                    <td className="px-3 py-3">
                      <StatusBadge status={listing.status} />
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-900">{property.title}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {uploader?.name ?? listing.userId}
                      {company ? <span className="text-xs text-slate-500"> (Company: {company.name})</span> : null}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{new Date(listing.updatedAt).toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <Link href={`/admin/listings/${listing.id}`} className="font-semibold text-brand-700 hover:underline">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t(language, "myPosts")}</h2>
        <CommunityFeed
          initialPosts={posts}
          listings={communityListings}
          viewer={{ id: user.id, role: user.role, canCreatePost: false }}
          showListings
          showCreatePost={false}
          listingSectionTitle={t(language, "propertyPosts")}
          emptyListingsMessage={null}
          emptyPostsMessage={t(language, "noCommunityPostsYet")}
          postsRefreshUrl={`/api/community/users/${encodeURIComponent(seller.id)}/posts`}
        />
      </section>
    </div>
  );
}

import { redirect } from "next/navigation";
import { ApprovedListings } from "@/components/admin/approved-listings";
import { requireRole } from "@/lib/auth";
import { listApprovedListingsDetailed } from "@/lib/repository";

export default async function AdminApprovedPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/admin/login");
  const approved = listApprovedListingsDetailed();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Approved Queue</h1>
      <ApprovedListings items={approved} />
    </div>
  );
}


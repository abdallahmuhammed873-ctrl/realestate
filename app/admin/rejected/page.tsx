import { redirect } from "next/navigation";
import { RejectedListings } from "@/components/admin/rejected-listings";
import { requireRole } from "@/lib/auth";
import { listRejectedListingsDetailed } from "@/lib/repository";

export default async function AdminRejectedPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/admin/login");
  const rejected = listRejectedListingsDetailed();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Rejected Queue</h1>
      <RejectedListings items={rejected} />
    </div>
  );
}


import { redirect } from "next/navigation";
import { PendingListings } from "@/components/admin/pending-listings";
import { requireRole } from "@/lib/auth";
import { listPendingListingsDetailed } from "@/lib/repository";

export default async function AdminPendingPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/admin/login");
  const pending = await listPendingListingsDetailed();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pending Approvals</h1>
      <PendingListings items={pending} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { BuyersManager } from "@/components/admin/buyers-manager";
import { requireRole } from "@/lib/auth";
import { listBuyerProfilesForAdmin } from "@/lib/repository";

export default async function AdminBuyersPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/admin/login");

  const buyerProfiles = await listBuyerProfilesForAdmin();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Buyer Profiles</h1>
      <BuyersManager initialItems={buyerProfiles} />
    </div>
  );
}

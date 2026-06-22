import { redirect } from "next/navigation";
import { AdminManagementHeader } from "@/components/admin/admin-management-header";
import { BuyersManager } from "@/components/admin/buyers-manager";
import { requireRole } from "@/lib/auth";
import { listBuyerProfilesForAdmin } from "@/lib/repository";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AdminBuyersPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/auth");

  const buyerProfiles = await listBuyerProfilesForAdmin();

  return (
    <div className="space-y-4">
      <AdminManagementHeader language={language} title={t(language, "buyerProfiles")} />
      <BuyersManager initialItems={buyerProfiles} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { AdminManagementHeader } from "@/components/admin/admin-management-header";
import { SellersManager } from "@/components/admin/sellers-manager";
import { requireRole } from "@/lib/auth";
import { listSellerProfilesForAdmin } from "@/lib/repository";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AdminSellersPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/auth");

  const sellerProfiles = await listSellerProfilesForAdmin();

  return (
    <div className="space-y-4">
      <AdminManagementHeader language={language} title={t(language, "sellerProfiles")} />
      <SellersManager initialItems={sellerProfiles} />
    </div>
  );
}

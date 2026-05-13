import { redirect } from "next/navigation";
import { SellersManager } from "@/components/admin/sellers-manager";
import { requireRole } from "@/lib/auth";
import { listSellerProfilesForAdmin } from "@/lib/repository";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AdminSellersPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/admin/login");

  const sellerProfiles = await listSellerProfilesForAdmin();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(language, "sellerProfiles")}</h1>
      <SellersManager initialItems={sellerProfiles} />
    </div>
  );
}

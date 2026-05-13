import { redirect } from "next/navigation";
import { BuyersManager } from "@/components/admin/buyers-manager";
import { requireRole } from "@/lib/auth";
import { listBuyerProfilesForAdmin } from "@/lib/repository";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AdminBuyersPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/admin/login");

  const buyerProfiles = await listBuyerProfilesForAdmin();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(language, "buyerProfiles")}</h1>
      <BuyersManager initialItems={buyerProfiles} />
    </div>
  );
}

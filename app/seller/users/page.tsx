import { redirect } from "next/navigation";
import { CompanyUsersManager } from "@/components/seller/company-users-manager";
import { requireRole } from "@/lib/auth";
import { listCompanyUsers } from "@/lib/repository";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function SellerUsersPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["SELLER"]);
  if (!user) redirect("/auth");
  if (user.companyOwnerId || !user.isCompanyAccount) {
    return <p className="rounded-2xl border bg-white p-6">{t(language, "companyUsersOnly")}</p>;
  }

  const users = await listCompanyUsers(user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(language, "companyUsers")}</h1>
      <CompanyUsersManager initialItems={users} />
    </div>
  );
}

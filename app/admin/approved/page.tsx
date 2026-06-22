import { redirect } from "next/navigation";
import { AdminManagementHeader } from "@/components/admin/admin-management-header";
import { ApprovedListings } from "@/components/admin/approved-listings";
import { requireRole } from "@/lib/auth";
import { listApprovedListingsDetailed } from "@/lib/repository";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AdminApprovedPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/auth");
  const approved = await listApprovedListingsDetailed();
  return (
    <div className="space-y-4">
      <AdminManagementHeader language={language} title={t(language, "approvedQueue")} />
      <ApprovedListings items={approved} />
    </div>
  );
}

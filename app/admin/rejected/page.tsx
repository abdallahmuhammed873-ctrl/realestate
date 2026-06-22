import { redirect } from "next/navigation";
import { AdminManagementHeader } from "@/components/admin/admin-management-header";
import { RejectedListings } from "@/components/admin/rejected-listings";
import { requireRole } from "@/lib/auth";
import { listRejectedListingsDetailed } from "@/lib/repository";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AdminRejectedPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/auth");
  const rejected = await listRejectedListingsDetailed();
  return (
    <div className="space-y-4">
      <AdminManagementHeader language={language} title={t(language, "rejectedQueue")} />
      <RejectedListings items={rejected} />
    </div>
  );
}

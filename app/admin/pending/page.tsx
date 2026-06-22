import { redirect } from "next/navigation";
import { AdminManagementHeader } from "@/components/admin/admin-management-header";
import { PendingListings } from "@/components/admin/pending-listings";
import { requireRole } from "@/lib/auth";
import { listPendingListingsDetailed } from "@/lib/repository";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AdminPendingPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/auth");
  const pending = await listPendingListingsDetailed();
  return (
    <div className="space-y-4">
      <AdminManagementHeader language={language} title={t(language, "pendingApprovalsPage")} />
      <PendingListings items={pending} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { PendingListings } from "@/components/admin/pending-listings";
import { requireRole } from "@/lib/auth";
import { listPendingListingsDetailed } from "@/lib/repository";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AdminPendingPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/admin/login");
  const pending = await listPendingListingsDetailed();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(language, "pendingApprovalsPage")}</h1>
      <PendingListings items={pending} />
    </div>
  );
}

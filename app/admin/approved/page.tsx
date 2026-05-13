import { redirect } from "next/navigation";
import { ApprovedListings } from "@/components/admin/approved-listings";
import { requireRole } from "@/lib/auth";
import { listApprovedListingsDetailed } from "@/lib/repository";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AdminApprovedPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/admin/login");
  const approved = await listApprovedListingsDetailed();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(language, "approvedQueue")}</h1>
      <ApprovedListings items={approved} />
    </div>
  );
}

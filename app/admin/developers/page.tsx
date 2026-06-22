import { redirect } from "next/navigation";
import { AdminManagementHeader } from "@/components/admin/admin-management-header";
import { DevelopersManager } from "@/components/admin/developers-manager";
import { requireRole } from "@/lib/auth";
import { listDeveloperProfilesForAdmin } from "@/lib/repository";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AdminDevelopersPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/auth");

  const developerProfiles = await listDeveloperProfilesForAdmin();

  return (
    <div className="space-y-4">
      <AdminManagementHeader language={language} title={t(language, "developerProfiles")} />
      <DevelopersManager initialItems={developerProfiles} />
    </div>
  );
}

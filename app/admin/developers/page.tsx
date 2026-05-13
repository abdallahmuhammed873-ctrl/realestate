import { redirect } from "next/navigation";
import { DevelopersManager } from "@/components/admin/developers-manager";
import { requireRole } from "@/lib/auth";
import { listDeveloperProfilesForAdmin } from "@/lib/repository";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AdminDevelopersPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/admin/login");

  const developerProfiles = await listDeveloperProfilesForAdmin();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(language, "developerProfiles")}</h1>
      <DevelopersManager initialItems={developerProfiles} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { DevelopersManager } from "@/components/admin/developers-manager";
import { requireRole } from "@/lib/auth";
import { listDeveloperProfilesForAdmin } from "@/lib/repository";

export default async function AdminDevelopersPage() {
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/admin/login");

  const developerProfiles = listDeveloperProfilesForAdmin();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Developer Profiles</h1>
      <DevelopersManager initialItems={developerProfiles} />
    </div>
  );
}

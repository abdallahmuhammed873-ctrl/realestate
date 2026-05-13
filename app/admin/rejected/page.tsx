import { redirect } from "next/navigation";
import { RejectedListings } from "@/components/admin/rejected-listings";
import { requireRole } from "@/lib/auth";
import { listRejectedListingsDetailed } from "@/lib/repository";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function AdminRejectedPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["ADMIN"]);
  if (!user) redirect("/admin/login");
  const rejected = await listRejectedListingsDetailed();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(language, "rejectedQueue")}</h1>
      <RejectedListings items={rejected} />
    </div>
  );
}

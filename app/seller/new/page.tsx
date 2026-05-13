import { ListingWizard } from "@/components/seller/listing-wizard";
import { requireRole } from "@/lib/auth";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function SellerNewListingPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["SELLER"]);
  if (!user) return <p className="surface-card rounded-2xl p-6">{t(language, "sellerAccessRequired")}</p>;
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">{t(language, "createListing")}</h1>
      <ListingWizard />
    </div>
  );
}

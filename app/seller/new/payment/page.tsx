import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { ListingPaymentClient } from "./payment-client";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function SellerListingPaymentPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["SELLER"]);
  if (!user) return <p className="rounded-2xl border bg-white p-6">{t(language, "sellerOrDeveloperAccessRequired")}</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t(language, "listingPayment")}</h1>
        <Link href="/seller/new" className="text-sm font-semibold text-brand-700 hover:underline">
          {t(language, "backToListingDetails")}
        </Link>
      </div>
      <ListingPaymentClient />
    </div>
  );
}

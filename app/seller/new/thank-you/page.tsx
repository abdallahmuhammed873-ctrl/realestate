import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function SellerListingThankYouPage() {
  const language = await getRequestLanguage();
  const user = await requireRole(["SELLER"]);
  if (!user) redirect("/auth");

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-6">
      <h1 className="text-2xl font-bold">{t(language, "listingSubmitted")}</h1>
      <p className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800">{t(language, "listingSubmittedThanks")}</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/seller/dashboard" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
          {t(language, "goToDashboard")}
        </Link>
        <Link href="/" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
          {t(language, "home")}
        </Link>
      </div>
    </div>
  );
}

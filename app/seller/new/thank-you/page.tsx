import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

export default async function SellerListingThankYouPage() {
  const user = await requireRole(["SELLER"]);
  if (!user) redirect("/auth");

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-6">
      <h1 className="text-2xl font-bold">Listing Submitted</h1>
      <p className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800">
        Thanks for completing the listing, please wait for 2-3 business days until an admin review!
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/seller/dashboard" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
          Go to Dashboard
        </Link>
        <Link href="/" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
          Home
        </Link>
      </div>
    </div>
  );
}


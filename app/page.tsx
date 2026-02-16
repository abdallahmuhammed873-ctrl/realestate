import Link from "next/link";
import { QuickSearch } from "@/components/home/quick-search";
import { PropertyCard } from "@/components/property/property-card";
import { getCurrentUser } from "@/lib/auth";
import { getRecommendations, listNotifications, searchProperties } from "@/lib/repository";

export default async function HomePage() {
  const featured = searchProperties({ sort: "FEATURED", pageSize: 6, page: 1 });
  const rec = getRecommendations("u-buyer-1");
  const user = await getCurrentUser();
  const notifications = user ? listNotifications(user.id) : [];

  return (
    <div className="space-y-8">
      <section className="hero-watermark rounded-3xl border border-brand-100 p-8">
        <p className="mb-2 inline-block rounded-full bg-cheque px-3 py-1 text-xs font-semibold">Cheque & Key Trust Layer</p>
        <h1 className="max-w-2xl text-3xl font-extrabold md:text-5xl">Find verified properties with secure cash and installment plans.</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Inspired by marketplace speed and pro filters. Every public listing is admin-approved and stamped verified.
        </p>
        <div className="mt-5">
          <QuickSearch />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm font-semibold text-brand-700">Verified listings</p>
          <p className="mt-1 text-slate-600">Every listing is reviewed by admin before it appears in public search.</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm font-semibold text-brand-700">Secure payments & installments</p>
          <p className="mt-1 text-slate-600">Compare cash vs installment plans with down payment and monthly commitment visibility.</p>
        </div>
      </section>

      {user && (
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="mb-2 text-xl font-bold">Notifications</h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500">No updates yet.</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-700">
              {notifications.map((n) => (
                <li key={n.id}>{n.text}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-4 text-2xl font-bold">Featured Areas</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {["New Cairo", "Heliopolis", "Maadi"].map((area) => (
            <Link key={area} href={`/search?area=${encodeURIComponent(area)}`} className="rounded-2xl border bg-white p-5">
              <p className="font-semibold">{area}</p>
              <p className="text-sm text-slate-500">Verified listings and installment options</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Browse Categories</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Buy", href: "/search?transaction=BUY" },
            { label: "Rent", href: "/search?transaction=RENT" },
            { label: "Vacation", href: "/search?transaction=VACATION" }
          ].map((c) => (
            <Link key={c.label} href={c.href} className="rounded-2xl border bg-white p-5 text-lg font-semibold shadow-soft">
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Featured Listings</h2>
          <Link href="/search" className="text-sm font-semibold text-brand-700">
            View all
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featured.items.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Recommended for You</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rec.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

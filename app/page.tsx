import Link from "next/link";
import { QuickSearch } from "@/components/home/quick-search";
import { HeroListingsMarquee } from "@/components/home/hero-listings-marquee";
import { PropertyCard } from "@/components/property/property-card";
import { getCurrentUser } from "@/lib/auth";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t, translateLocation, translateTransaction } from "@/lib/i18n";
import { getRecommendations, listNotifications, searchProperties } from "@/lib/repository";

export default async function HomePage() {
  const language = await getRequestLanguage();
  const topPriced = searchProperties({ sort: "PRICE_DESC", pageSize: 3, page: 1 });
  const featured = searchProperties({ sort: "FEATURED", pageSize: 6, page: 1 });
  const heroImages = topPriced.items.map((p) => p.images?.[0]).filter(Boolean);
  const rec = getRecommendations("u-buyer-1");
  const user = await getCurrentUser();
  const notifications = user ? listNotifications(user.id) : [];

  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <div className="space-y-4">
          <div className="relative h-[320px] w-full overflow-hidden rounded-3xl md:h-[420px]">
            <HeroListingsMarquee images={heroImages} />
            <div className="pointer-events-none absolute inset-0 flex items-start">
              <div className="m-6 max-w-4xl rounded-3xl bg-white/45 p-5 text-slate-900 shadow-soft backdrop-blur-[4px] md:m-10 md:p-7">
                <h1 className="text-3xl font-extrabold md:text-5xl">{t(language, "heroTitle")}</h1>
                <p className="mt-3 max-w-3xl text-slate-700">{t(language, "heroDescription")}</p>
              </div>
            </div>
          </div>

          <div className="w-full">
            <QuickSearch language={language} />
          </div>
        </div>
      </section>

      {user && (
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="mb-2 text-xl font-bold">{t(language, "notifications")}</h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500">{t(language, "noUpdatesYet")}</p>
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
        <h2 className="mb-4 text-2xl font-bold">{t(language, "featuredAreas")}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {["New Cairo", "Heliopolis", "Maadi"].map((area) => (
            <Link key={area} href={`/search?area=${encodeURIComponent(area)}`} className="rounded-2xl border bg-white p-5">
              <p className="font-semibold">{translateLocation(area, language)}</p>
              <p className="text-sm text-slate-500">{t(language, "verifiedInstallments")}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">{t(language, "browseCategories")}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Buy", href: "/search?transaction=BUY" },
            { label: "Rent", href: "/search?transaction=RENT" },
            { label: "Vacation", href: "/search?transaction=VACATION" }
          ].map((c) => (
            <Link key={c.label} href={c.href} className="rounded-2xl border bg-white p-5 text-lg font-semibold shadow-soft">
              {translateTransaction(c.label.toUpperCase() as "BUY" | "RENT" | "VACATION", language)}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t(language, "featuredListings")}</h2>
          <Link href="/search" className="text-sm font-semibold text-brand-700">
            {t(language, "viewAll")}
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featured.items.map((p) => (
            <PropertyCard key={p.id} property={p} language={language} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">{t(language, "recommendedForYou")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rec.map((p) => (
            <PropertyCard key={p.id} property={p} language={language} />
          ))}
        </div>
      </section>
    </div>
  );
}

import { FiltersPanel } from "@/components/search/filters-panel";
import { Pagination } from "@/components/search/pagination";
import { ResultsToolbar } from "@/components/search/results-toolbar";
import { PropertyCard } from "@/components/property/property-card";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { searchProperties } from "@/lib/repository";
import { parseSearchParams } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const language = await getRequestLanguage();
  const filters = parseSearchParams(resolved);
  const result = await searchProperties(filters);

  return (
    <div className="grid gap-4 md:grid-cols-[290px,1fr]">
      <FiltersPanel />
      <section>
        <ResultsToolbar total={result.total} />
        {result.items.length === 0 ? (
          <div className="surface-card text-muted rounded-2xl p-8 text-center">{t(language, "noResultsMatched")}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.items.map((property) => (
              <PropertyCard key={property.id} property={property} language={language} />
            ))}
          </div>
        )}
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
      </section>
    </div>
  );
}

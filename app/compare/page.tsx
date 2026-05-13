import { CompareClient } from "@/components/property/compare-client";
import { getRequestLanguage } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function ComparePage() {
  const language = await getRequestLanguage();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t(language, "compareProperties")}</h1>
      <CompareClient />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/layout/language-provider";
import { Button } from "@/components/ui/button";
import {
  translateFurnishing,
  translateLocation,
  translatePaymentType,
  translatePropertyType
} from "@/lib/i18n";
import type { Furnishing, PaymentType, PropertyType } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

type CompareItem = {
  id: string;
  title: string;
  type: string;
  city: string;
  area: string;
  district: string;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  currency: string;
  price: number | null;
  rentPrice: number | null;
  transaction: string;
  paymentType: string;
  furnishing: string;
};

const KEY = "compare_properties";
type CompareRow = [label: string, fn: (i: CompareItem) => string];

export function CompareClient() {
  const { direction, language, t } = useLanguage();
  const [items, setItems] = useState<CompareItem[]>([]);

  async function load() {
    const ids = (JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]).slice(0, 4);
    localStorage.setItem(KEY, JSON.stringify(ids));
    if (!ids.length) {
      setItems([]);
      return;
    }
    const res = await fetch(`/api/properties/by-ids?ids=${ids.join(",")}`);
    const data = await res.json();
    setItems(data.items ?? []);
  }

  useEffect(() => {
    load();
    window.addEventListener("compare-updated", load);
    return () => window.removeEventListener("compare-updated", load);
  }, []);

  function clear() {
    localStorage.removeItem(KEY);
    load();
  }

  if (!items.length) return <p className="rounded-2xl border bg-white p-6 text-center text-slate-600">{t("noComparedPropertiesYet")}</p>;
  const rows: CompareRow[] = [
    [t("priceLabel"), (i) => formatPrice(i.transaction === "RENT" ? i.rentPrice : i.price, i.currency, language)],
    [t("location"), (i) => `${translateLocation(i.city, language)}, ${translateLocation(i.area, language)}, ${translateLocation(i.district, language)}`],
    [t("typeLabel"), (i) => translatePropertyType(i.type as PropertyType, language)],
    [t("bedsBaths"), (i) => `${i.bedrooms}/${i.bathrooms}`],
    [t("areaLabel"), (i) => `${i.areaSqm} ${t("sqm")}`],
    [t("paymentLabel"), (i) => translatePaymentType(i.paymentType as PaymentType, language)],
    [t("furnishingLabel"), (i) => translateFurnishing(i.furnishing as Furnishing, language)]
  ];

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={clear}>
        {t("clearCompare")}
      </Button>
      <div className="overflow-auto rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className={`bg-slate-50 ${direction === "rtl" ? "text-right" : "text-left"}`}>
            <tr>
              <th className="p-2">{t("field")}</th>
              {items.map((i) => (
                <th key={i.id} className="p-2">
                  {i.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label} className="border-t">
                <td className="p-2 font-semibold">{label}</td>
                {items.map((i) => (
                  <td key={`${i.id}-${label}`} className="p-2">
                    {fn(i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

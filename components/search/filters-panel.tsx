"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/layout/language-provider";
import { AMENITIES, LOCATION_TREE } from "@/lib/constants";
import type { PropertyType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DebouncedInput } from "@/components/search/debounced-input";
import {
  translateAmenity,
  translateCompletionStatus,
  translateFurnishing,
  translateLocation,
  translatePaymentType,
  translatePropertyType,
  translateTransaction
} from "@/lib/i18n";

function setParam(params: URLSearchParams, key: string, value?: string) {
  if (!value) params.delete(key);
  else params.set(key, value);
}

export function FiltersPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams();
  const { language, t } = useLanguage();
  const [openMobile, setOpenMobile] = useState(false);
  const params = useMemo(() => new URLSearchParams(current.toString()), [current]);

  const city = current.get("city") ?? "";
  const area = current.get("area") ?? "";
  const areaOptions = city ? Object.keys(LOCATION_TREE[city] ?? {}) : [];
  const districtOptions = city && area ? LOCATION_TREE[city]?.[area] ?? [] : [];
  const amenities = (current.get("amenities") ?? "").split(",").filter(Boolean);

  function apply(nextParams: URLSearchParams) {
    if (!nextParams.get("page")) nextParams.set("page", "1");
    router.push(`${pathname}?${nextParams.toString()}`);
  }

  const onKeywordChange = useCallback(
    (value: string) => {
      const next = new URLSearchParams(params);
      setParam(next, "q", value.trim());
      apply(next);
    },
    [params]
  );

  function content() {
    return (
      <div className="space-y-3">
        <DebouncedInput initialValue={current.get("q") ?? ""} placeholder={t("keyword")} onDebouncedChange={onKeywordChange} />
        <Select
          defaultValue={current.get("transaction") ?? ""}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            setParam(next, "transaction", e.target.value);
            apply(next);
          }}
        >
          <option value="">{t("transaction")}</option>
          <option value="BUY">{translateTransaction("BUY", language)}</option>
          <option value="RENT">{translateTransaction("RENT", language)}</option>
          <option value="VACATION">{translateTransaction("VACATION", language)}</option>
        </Select>
        <Select
          defaultValue={current.get("type") ?? ""}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            setParam(next, "type", e.target.value);
            apply(next);
          }}
        >
          <option value="">{t("propertyType")}</option>
          {["APARTMENT", "VILLA", "DUPLEX", "PENTHOUSE", "CHALET", "LAND", "COMMERCIAL"].map((propertyType) => (
            <option key={propertyType} value={propertyType}>
              {translatePropertyType(propertyType as PropertyType, language)}
            </option>
          ))}
        </Select>
        <Select
          value={city}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            setParam(next, "city", e.target.value);
            next.delete("area");
            next.delete("district");
            apply(next);
          }}
        >
          <option value="">{t("city")}</option>
          {Object.keys(LOCATION_TREE).map((c) => (
            <option key={c} value={c}>
              {translateLocation(c, language)}
            </option>
          ))}
        </Select>
        <Select
          value={area}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            setParam(next, "area", e.target.value);
            next.delete("district");
            apply(next);
          }}
        >
          <option value="">{t("area")}</option>
          {areaOptions.map((a) => (
            <option key={a} value={a}>
              {translateLocation(a, language)}
            </option>
          ))}
        </Select>
        <Select
          value={current.get("district") ?? ""}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            setParam(next, "district", e.target.value);
            apply(next);
          }}
        >
          <option value="">{t("district")}</option>
          {districtOptions.map((d) => (
            <option key={d} value={d}>
              {translateLocation(d, language)}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder={t("minPrice")}
            defaultValue={current.get("minPrice") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "minPrice", e.target.value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder={t("maxPrice")}
            defaultValue={current.get("maxPrice") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "maxPrice", e.target.value);
              apply(next);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            { label: "<2M", min: "", max: "2000000" },
            { label: "2-5M", min: "2000000", max: "5000000" },
            { label: "5-10M", min: "5000000", max: "10000000" }
          ].map((chip) => (
            <button
              type="button"
              key={chip.label}
              className="rounded-full border border-slate-300 px-2 py-1 text-xs"
              onClick={() => {
                const next = new URLSearchParams(params);
                setParam(next, "minPrice", chip.min);
                setParam(next, "maxPrice", chip.max);
                apply(next);
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder={t("minArea")}
            defaultValue={current.get("minArea") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "minArea", e.target.value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder={t("maxArea")}
            defaultValue={current.get("maxArea") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "maxArea", e.target.value);
              apply(next);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder={t("minBeds")}
            defaultValue={current.get("minBeds") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "minBeds", e.target.value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder={t("maxBeds")}
            defaultValue={current.get("maxBeds") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "maxBeds", e.target.value);
              apply(next);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder={t("minBaths")}
            defaultValue={current.get("minBaths") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "minBaths", e.target.value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder={t("maxBaths")}
            defaultValue={current.get("maxBaths") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "maxBaths", e.target.value);
              apply(next);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder={t("referenceLat")}
            defaultValue={current.get("lat") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "lat", e.target.value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder={t("referenceLng")}
            defaultValue={current.get("lng") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "lng", e.target.value);
              apply(next);
            }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-600">{t("distanceKm")}</label>
          <input
            type="range"
            min={1}
            max={50}
            defaultValue={current.get("distanceKm") ?? "20"}
            className="w-full accent-brand-700"
            onMouseUp={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "distanceKm", (e.target as HTMLInputElement).value);
              apply(next);
            }}
            onTouchEnd={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "distanceKm", (e.target as HTMLInputElement).value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder={t("distanceKm")}
            defaultValue={current.get("distanceKm") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "distanceKm", e.target.value);
              apply(next);
            }}
          />
        </div>
        <Select
          defaultValue={current.get("paymentType") ?? ""}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            setParam(next, "paymentType", e.target.value);
            apply(next);
          }}
        >
          <option value="">{t("payment")}</option>
          <option value="CASH">{translatePaymentType("CASH", language)}</option>
          <option value="INSTALLMENTS">{translatePaymentType("INSTALLMENTS", language)}</option>
        </Select>
        <div className="grid grid-cols-3 gap-2">
          <Input
            type="number"
            placeholder={t("downPaymentMax")}
            defaultValue={current.get("downPaymentMax") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "downPaymentMax", e.target.value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder={t("yearsMax")}
            defaultValue={current.get("installmentYearsMax") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "installmentYearsMax", e.target.value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder={t("monthlyMax")}
            defaultValue={current.get("installmentMonthlyMax") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "installmentMonthlyMax", e.target.value);
              apply(next);
            }}
          />
        </div>
        <Select
          defaultValue={current.get("furnishing") ?? ""}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            setParam(next, "furnishing", e.target.value);
            apply(next);
          }}
        >
          <option value="">{t("furnishing")}</option>
          <option value="FULLY">{translateFurnishing("FULLY", language)}</option>
          <option value="SEMI">{translateFurnishing("SEMI", language)}</option>
          <option value="UNFURNISHED">{translateFurnishing("UNFURNISHED", language)}</option>
        </Select>
        <Select
          defaultValue={current.get("completionStatus") ?? ""}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            setParam(next, "completionStatus", e.target.value);
            apply(next);
          }}
        >
          <option value="">{t("completion")}</option>
          <option value="OFF_PLAN">{translateCompletionStatus("OFF_PLAN", language)}</option>
          <option value="READY">{translateCompletionStatus("READY", language)}</option>
        </Select>
        <div>
          <p className="mb-1 text-sm font-semibold">{t("amenities")}</p>
          <div className="flex flex-wrap gap-1">
            {AMENITIES.map((a) => {
              const active = amenities.includes(a);
              return (
                <button
                  type="button"
                  key={a}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    const currentAmenities = (next.get("amenities") ?? "").split(",").filter(Boolean);
                    const updated = currentAmenities.includes(a) ? currentAmenities.filter((x) => x !== a) : [...currentAmenities, a];
                    setParam(next, "amenities", updated.join(","));
                    apply(next);
                  }}
                  className={`rounded-full border px-2 py-1 text-xs ${active ? "border-brand-700 bg-brand-100 text-brand-700" : "border-slate-300"}`}
                >
                  {translateAmenity(a, language)}
                </button>
              );
            })}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            router.push(pathname);
            setOpenMobile(false);
          }}
          className="w-full"
        >
          {t("reset")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="hidden rounded-2xl border bg-white p-4 md:block md:sticky md:top-20">{content()}</div>
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-white/95 p-2 md:hidden">
        <Button className="w-full" onClick={() => setOpenMobile(true)}>
          {t("filters")}
        </Button>
      </div>
      {openMobile && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 p-4 md:hidden">
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-auto rounded-t-2xl bg-white p-4">
            <div className="mb-2 flex justify-between">
              <h2 className="font-bold">{t("filters")}</h2>
              <button onClick={() => setOpenMobile(false)}>{t("close")}</button>
            </div>
            {content()}
          </div>
        </div>
      )}
    </>
  );
}

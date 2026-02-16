"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AMENITIES, LOCATION_TREE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DebouncedInput } from "@/components/search/debounced-input";

function setParam(params: URLSearchParams, key: string, value?: string) {
  if (!value) params.delete(key);
  else params.set(key, value);
}

export function FiltersPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams();
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
        <DebouncedInput initialValue={current.get("q") ?? ""} placeholder="Keyword" onDebouncedChange={onKeywordChange} />
        <Select
          defaultValue={current.get("transaction") ?? ""}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            setParam(next, "transaction", e.target.value);
            apply(next);
          }}
        >
          <option value="">Transaction</option>
          <option value="BUY">Buy</option>
          <option value="RENT">Rent</option>
          <option value="VACATION">Vacation</option>
        </Select>
        <Select
          defaultValue={current.get("type") ?? ""}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            setParam(next, "type", e.target.value);
            apply(next);
          }}
        >
          <option value="">Property Type</option>
          {["APARTMENT", "VILLA", "DUPLEX", "PENTHOUSE", "CHALET", "LAND", "COMMERCIAL"].map((t) => (
            <option key={t} value={t}>
              {t}
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
          <option value="">City</option>
          {Object.keys(LOCATION_TREE).map((c) => (
            <option key={c} value={c}>
              {c}
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
          <option value="">Area</option>
          {areaOptions.map((a) => (
            <option key={a} value={a}>
              {a}
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
          <option value="">District</option>
          {districtOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min Price"
            defaultValue={current.get("minPrice") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "minPrice", e.target.value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder="Max Price"
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
            placeholder="Min Area"
            defaultValue={current.get("minArea") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "minArea", e.target.value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder="Max Area"
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
            placeholder="Min Beds"
            defaultValue={current.get("minBeds") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "minBeds", e.target.value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder="Max Beds"
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
            placeholder="Min Baths"
            defaultValue={current.get("minBaths") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "minBaths", e.target.value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder="Max Baths"
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
            placeholder="Ref Lat"
            defaultValue={current.get("lat") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "lat", e.target.value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder="Ref Lng"
            defaultValue={current.get("lng") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "lng", e.target.value);
              apply(next);
            }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-600">Distance (km)</label>
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
            placeholder="Distance (km)"
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
          <option value="">Payment</option>
          <option value="CASH">Cash</option>
          <option value="INSTALLMENTS">Installments</option>
        </Select>
        <div className="grid grid-cols-3 gap-2">
          <Input
            type="number"
            placeholder="Down Pmt <= "
            defaultValue={current.get("downPaymentMax") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "downPaymentMax", e.target.value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder="Years <= "
            defaultValue={current.get("installmentYearsMax") ?? ""}
            onBlur={(e) => {
              const next = new URLSearchParams(params);
              setParam(next, "installmentYearsMax", e.target.value);
              apply(next);
            }}
          />
          <Input
            type="number"
            placeholder="Monthly <= "
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
          <option value="">Furnishing</option>
          <option value="FULLY">Fully</option>
          <option value="SEMI">Semi</option>
          <option value="UNFURNISHED">Unfurnished</option>
        </Select>
        <Select
          defaultValue={current.get("completionStatus") ?? ""}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            setParam(next, "completionStatus", e.target.value);
            apply(next);
          }}
        >
          <option value="">Completion</option>
          <option value="OFF_PLAN">Off-plan</option>
          <option value="READY">Ready</option>
        </Select>
        <div>
          <p className="mb-1 text-sm font-semibold">Amenities</p>
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
                  {a}
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
          Reset
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="hidden rounded-2xl border bg-white p-4 md:block md:sticky md:top-20">{content()}</div>
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-white/95 p-2 md:hidden">
        <Button className="w-full" onClick={() => setOpenMobile(true)}>
          Filters
        </Button>
      </div>
      {openMobile && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 p-4 md:hidden">
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-auto rounded-t-2xl bg-white p-4">
            <div className="mb-2 flex justify-between">
              <h2 className="font-bold">Filters</h2>
              <button onClick={() => setOpenMobile(false)}>Close</button>
            </div>
            {content()}
          </div>
        </div>
      )}
    </>
  );
}

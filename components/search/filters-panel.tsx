"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const ALL_PROPERTY_TYPES_VALUE = "__ALL_PROPERTY_TYPES__";

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
  const paramsRef = useRef(new URLSearchParams(current.toString()));
  const transaction = current.get("transaction") ?? "";
  const propertyType = current.get("type") ?? "";
  const [transactionValue, setTransactionValue] = useState(transaction);
  const [propertyTypeValue, setPropertyTypeValue] = useState(propertyType);

  const city = current.get("city") ?? "";
  const area = current.get("area") ?? "";
  const areaOptions = city ? Object.keys(LOCATION_TREE[city] ?? {}) : [];
  const districtOptions = city && area ? LOCATION_TREE[city]?.[area] ?? [] : [];
  const amenities = (current.get("amenities") ?? "").split(",").filter(Boolean);

  useEffect(() => {
    paramsRef.current = new URLSearchParams(current.toString());
  }, [current]);

  useEffect(() => {
    setTransactionValue(transaction);
  }, [transaction]);

  useEffect(() => {
    setPropertyTypeValue(propertyType);
  }, [propertyType]);

  function apply(nextParams: URLSearchParams) {
    nextParams.set("page", "1");
    paramsRef.current = new URLSearchParams(nextParams.toString());
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function updateParams(updater: (nextParams: URLSearchParams) => void) {
    const next = new URLSearchParams(paramsRef.current.toString());
    updater(next);
    apply(next);
  }

  const onKeywordChange = useCallback(
    (value: string) => {
      updateParams((next) => {
        setParam(next, "q", value.trim());
      });
    },
    []
  );

  function content() {
    return (
      <div key={current.toString()} className="space-y-3">
        <DebouncedInput initialValue={current.get("q") ?? ""} placeholder={t("keyword")} onDebouncedChange={onKeywordChange} />
        <Select
          value={transactionValue}
          onChange={(e) => {
            const value = e.target.value;
            setTransactionValue(value);
            updateParams((next) => {
              setParam(next, "transaction", value);
            });
          }}
        >
          <option value="">{t("transaction")}</option>
          <option value="BUY">{translateTransaction("BUY", language)}</option>
          <option value="RENT">{translateTransaction("RENT", language)}</option>
          <option value="VACATION">{translateTransaction("VACATION", language)}</option>
        </Select>
        <Select
          value={propertyTypeValue || ALL_PROPERTY_TYPES_VALUE}
          onChange={(e) => {
            const value = e.target.value === ALL_PROPERTY_TYPES_VALUE ? "" : e.target.value;
            updateParams((next) => {
              setParam(next, "type", value);
            });
            setPropertyTypeValue(value);
          }}
        >
          <option value={ALL_PROPERTY_TYPES_VALUE}>{t("propertyType")}</option>
          {["APARTMENT", "VILLA", "DUPLEX", "PENTHOUSE", "CHALET", "LAND", "COMMERCIAL"].map((propertyType) => (
            <option key={propertyType} value={propertyType}>
              {translatePropertyType(propertyType as PropertyType, language)}
            </option>
          ))}
        </Select>
        <Select
          value={city}
          onChange={(e) => {
            updateParams((next) => {
              setParam(next, "city", e.target.value);
              next.delete("area");
              next.delete("district");
            });
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
            updateParams((next) => {
              setParam(next, "area", e.target.value);
              next.delete("district");
            });
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
            updateParams((next) => {
              setParam(next, "district", e.target.value);
            });
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
              updateParams((next) => {
                setParam(next, "minPrice", e.target.value);
              });
            }}
          />
          <Input
            type="number"
            placeholder={t("maxPrice")}
            defaultValue={current.get("maxPrice") ?? ""}
            onBlur={(e) => {
              updateParams((next) => {
                setParam(next, "maxPrice", e.target.value);
              });
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
              className="theme-divider rounded-full border px-2 py-1 text-xs"
              onClick={() => {
                updateParams((next) => {
                  setParam(next, "minPrice", chip.min);
                  setParam(next, "maxPrice", chip.max);
                });
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
              updateParams((next) => {
                setParam(next, "minArea", e.target.value);
              });
            }}
          />
          <Input
            type="number"
            placeholder={t("maxArea")}
            defaultValue={current.get("maxArea") ?? ""}
            onBlur={(e) => {
              updateParams((next) => {
                setParam(next, "maxArea", e.target.value);
              });
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder={t("minBeds")}
            defaultValue={current.get("minBeds") ?? ""}
            onBlur={(e) => {
              updateParams((next) => {
                setParam(next, "minBeds", e.target.value);
              });
            }}
          />
          <Input
            type="number"
            placeholder={t("maxBeds")}
            defaultValue={current.get("maxBeds") ?? ""}
            onBlur={(e) => {
              updateParams((next) => {
                setParam(next, "maxBeds", e.target.value);
              });
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder={t("minBaths")}
            defaultValue={current.get("minBaths") ?? ""}
            onBlur={(e) => {
              updateParams((next) => {
                setParam(next, "minBaths", e.target.value);
              });
            }}
          />
          <Input
            type="number"
            placeholder={t("maxBaths")}
            defaultValue={current.get("maxBaths") ?? ""}
            onBlur={(e) => {
              updateParams((next) => {
                setParam(next, "maxBaths", e.target.value);
              });
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder={t("referenceLat")}
            defaultValue={current.get("lat") ?? ""}
            onBlur={(e) => {
              updateParams((next) => {
                setParam(next, "lat", e.target.value);
              });
            }}
          />
          <Input
            type="number"
            placeholder={t("referenceLng")}
            defaultValue={current.get("lng") ?? ""}
            onBlur={(e) => {
              updateParams((next) => {
                setParam(next, "lng", e.target.value);
              });
            }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-soft text-xs">{t("distanceKm")}</label>
          <input
            type="range"
            min={1}
            max={50}
            defaultValue={current.get("distanceKm") ?? "20"}
            className="w-full accent-brand-700"
            onMouseUp={(e) => {
              updateParams((next) => {
                setParam(next, "distanceKm", (e.target as HTMLInputElement).value);
              });
            }}
            onTouchEnd={(e) => {
              updateParams((next) => {
                setParam(next, "distanceKm", (e.target as HTMLInputElement).value);
              });
            }}
          />
          <Input
            type="number"
            placeholder={t("distanceKm")}
            defaultValue={current.get("distanceKm") ?? ""}
            onBlur={(e) => {
              updateParams((next) => {
                setParam(next, "distanceKm", e.target.value);
              });
            }}
          />
        </div>
        <Select
          value={current.get("paymentType") ?? ""}
          onChange={(e) => {
            updateParams((next) => {
              setParam(next, "paymentType", e.target.value);
            });
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
              updateParams((next) => {
                setParam(next, "downPaymentMax", e.target.value);
              });
            }}
          />
          <Input
            type="number"
            placeholder={t("yearsMax")}
            defaultValue={current.get("installmentYearsMax") ?? ""}
            onBlur={(e) => {
              updateParams((next) => {
                setParam(next, "installmentYearsMax", e.target.value);
              });
            }}
          />
          <Input
            type="number"
            placeholder={t("monthlyMax")}
            defaultValue={current.get("installmentMonthlyMax") ?? ""}
            onBlur={(e) => {
              updateParams((next) => {
                setParam(next, "installmentMonthlyMax", e.target.value);
              });
            }}
          />
        </div>
        <Select
          value={current.get("furnishing") ?? ""}
          onChange={(e) => {
            updateParams((next) => {
              setParam(next, "furnishing", e.target.value);
            });
          }}
        >
          <option value="">{t("furnishing")}</option>
          <option value="FULLY">{translateFurnishing("FULLY", language)}</option>
          <option value="SEMI">{translateFurnishing("SEMI", language)}</option>
          <option value="UNFURNISHED">{translateFurnishing("UNFURNISHED", language)}</option>
        </Select>
        <Select
          value={current.get("completionStatus") ?? ""}
          onChange={(e) => {
            updateParams((next) => {
              setParam(next, "completionStatus", e.target.value);
            });
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
                    updateParams((next) => {
                      const currentAmenities = (next.get("amenities") ?? "").split(",").filter(Boolean);
                      const updated = currentAmenities.includes(a)
                        ? currentAmenities.filter((x) => x !== a)
                        : [...currentAmenities, a];
                      setParam(next, "amenities", updated.join(","));
                    });
                  }}
                  className={`rounded-full border px-2 py-1 text-xs ${active ? "border-brand-700 bg-brand-100 text-brand-700" : "theme-divider"}`}
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
            paramsRef.current = new URLSearchParams();
            setTransactionValue("");
            setPropertyTypeValue("");
            router.replace(pathname, { scroll: false });
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
      <div className="surface-card hidden rounded-2xl p-4 md:block md:sticky md:top-20">{content()}</div>
      <div className="surface-panel fixed bottom-16 left-0 right-0 z-30 p-2 md:hidden">
        <Button className="w-full" onClick={() => setOpenMobile(true)}>
          {t("filters")}
        </Button>
      </div>
      {openMobile && (
        <div className="overlay-backdrop fixed inset-0 z-40 p-4 md:hidden">
          <div className="surface-card absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-auto rounded-t-2xl p-4">
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

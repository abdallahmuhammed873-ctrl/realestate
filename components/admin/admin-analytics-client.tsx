"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/components/layout/language-provider";
import { Card } from "@/components/ui/card";
import {
  getLocalizedPropertyTitle,
  translateLocation,
  translatePropertyType,
  translateTransaction,
  type CommonTranslationKey,
  type Language
} from "@/lib/i18n";
import type { AnalyticsDashboard, AnalyticsFilters, AnalyticsOption } from "@/lib/services/analytics-service";
import type { ListingStatus, PropertyType, TransactionType } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

type ChartDatum = { label: string; count?: number; value?: number };
type TrendDatum = { label: string; count: number };
type StackedDatum = { label: string; values: Record<string, number> };

const FILTER_STORAGE_KEY = "admin-analytics-filters";
const chartColors = ["#67d4e5", "#f4c86a", "#8bd17c", "#f28e8e", "#a78bfa", "#f59e0b", "#34d399", "#60a5fa"];
const listingStatuses: ListingStatus[] = ["DRAFT", "PENDING", "APPROVED", "REJECTED"];
const adminActionLinks: Array<{ href: string; labelKey: CommonTranslationKey; primary?: boolean }> = [
  { href: "/admin/pending", labelKey: "openPendingQueue", primary: true },
  { href: "/admin/rejected", labelKey: "openRejectedQueue" },
  { href: "/admin/approved", labelKey: "openApprovedQueue" },
  { href: "/admin/sellers", labelKey: "viewSellerProfiles" },
  { href: "/admin/buyers", labelKey: "viewBuyerProfiles" },
  { href: "/admin/developers", labelKey: "viewDeveloperProfiles" }
];

function emptyFilters(): AnalyticsFilters {
  return {
    cities: [],
    governorates: [],
    propertyTypes: [],
    transactionTypes: [],
    listingStatuses: [],
    sellerIds: [],
    developerIds: [],
    buyerIds: [],
    userTypes: []
  };
}

function filtersToParams(filters: AnalyticsFilters) {
  const params = new URLSearchParams();
  const addList = (key: keyof AnalyticsFilters, values: string[]) => values.forEach((value) => params.append(key, value));
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  addList("cities", filters.cities);
  addList("governorates", filters.governorates);
  addList("propertyTypes", filters.propertyTypes);
  addList("transactionTypes", filters.transactionTypes);
  addList("listingStatuses", filters.listingStatuses);
  addList("sellerIds", filters.sellerIds);
  addList("developerIds", filters.developerIds);
  addList("buyerIds", filters.buyerIds);
  addList("userTypes", filters.userTypes);
  if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
  if (filters.minAiPrice != null) params.set("minAiPrice", String(filters.minAiPrice));
  if (filters.maxAiPrice != null) params.set("maxAiPrice", String(filters.maxAiPrice));
  return params;
}

function formatNumber(value: number, language: Language) {
  return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US").format(value);
}

function formatCompact(value: number, language: Language) {
  return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatPercent(value: number, language: Language) {
  return `${formatNumber(value, language)}%`;
}

function statusLabel(status: string, t: (key: CommonTranslationKey) => string) {
  if (status === "DRAFT") return t("statusDraft");
  if (status === "PENDING") return t("statusPending");
  if (status === "APPROVED") return t("statusApproved");
  if (status === "REJECTED") return t("statusRejected");
  if (status === "CONFIRMED") return t("statusConfirmed");
  if (status === "CANCELLED") return t("statusCancelled");
  if (status === "RESCHEDULED") return t("statusRescheduled");
  return status;
}

function roleLabel(role: string, t: (key: CommonTranslationKey) => string) {
  if (role === "BUYER") return t("buyer");
  if (role === "SELLER") return t("seller");
  if (role === "DEVELOPER") return t("developer");
  if (role === "ADMIN") return t("admin");
  return role;
}

function eventLabel(label: string, t: (key: CommonTranslationKey) => string) {
  if (label === "PROPERTY_VIEW") return t("propertyViewEvent");
  if (label === "PROPERTY_FAVORITE") return t("propertyFavoriteEvent");
  if (label === "PROPERTY_COMPARE") return t("propertyCompareEvent");
  if (label === "PROPERTY_SOLD") return t("propertySoldEvent");
  if (label === "APPOINTMENT_REQUEST") return t("appointmentRequestEvent");
  if (label === "SEARCH") return t("searchEvent");
  if (label === "PRICE_ESTIMATE") return t("priceEstimateEvent");
  return label.replaceAll("_", " ");
}

function translateLabel(label: string, language: Language, t: (key: CommonTranslationKey) => string) {
  if (listingStatuses.includes(label as ListingStatus)) return statusLabel(label, t);
  if (["APARTMENT", "VILLA", "DUPLEX", "PENTHOUSE", "CHALET", "LAND", "COMMERCIAL"].includes(label)) {
    return translatePropertyType(label as PropertyType, language);
  }
  if (["BUY", "RENT", "VACATION"].includes(label)) return translateTransaction(label as TransactionType, language);
  if (["BUYER", "SELLER", "DEVELOPER", "ADMIN"].includes(label)) return roleLabel(label, t);
  if (label === "ACTIVE") return t("activeLabel");
  if (label === "INACTIVE") return t("inactiveLabel");
  if (label === "DIRECT_OR_UNKNOWN") return t("directOrUnknown");
  if (label === "LISTINGS_CREATED") return t("listingsCreated");
  if (label.includes("_")) return eventLabel(label, t);
  return translateLocation(label, language);
}

function propertyTitle(
  property: { title: string; titleEn?: string | null; titleAr?: string | null },
  language: Language
) {
  return getLocalizedPropertyTitle(property, language);
}

function updateList<T extends string>(values: T[], value: T, checked: boolean) {
  return checked ? Array.from(new Set([...values, value])) : values.filter((item) => item !== value);
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="pt-2 text-xl font-bold text-[var(--ink)]">{children}</h2>;
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="min-h-[104px]">
      <p className="text-soft text-sm">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </Card>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("min-h-[280px]", className)}>
      <h3 className="mb-3 text-base font-bold">{title}</h3>
      {children}
    </Card>
  );
}

function NoData({ label }: { label: string }) {
  return <div className="flex min-h-[180px] items-center justify-center text-sm text-[var(--muted)]">{label}</div>;
}

function HorizontalBarChart({
  rows,
  language,
  t,
  valueType = "count",
  onSelect
}: {
  rows: ChartDatum[];
  language: Language;
  t: (key: CommonTranslationKey) => string;
  valueType?: "count" | "money";
  onSelect?: (label: string) => void;
}) {
  if (!rows.length) return <NoData label={t("noDataAvailable")} />;
  const max = Math.max(...rows.map((row) => row.count ?? row.value ?? 0), 1);
  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const value = row.count ?? row.value ?? 0;
        const label = translateLabel(row.label, language, t);
        const content = (
          <>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-[var(--muted)]">{label}</span>
              <span className="font-semibold">{valueType === "money" ? formatCompact(value, language) : formatNumber(value, language)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-soft)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max((value / max) * 100, value > 0 ? 2 : 0)}%`, backgroundColor: chartColors[index % chartColors.length] }}
              />
            </div>
          </>
        );
        return onSelect ? (
          <button key={row.label} type="button" title={`${label}: ${value}`} className="block w-full text-start" onClick={() => onSelect(row.label)}>
            {content}
          </button>
        ) : (
          <div key={row.label} title={`${label}: ${value}`}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function VerticalBarChart({
  rows,
  language,
  t,
  valueType = "count"
}: {
  rows: ChartDatum[];
  language: Language;
  t: (key: CommonTranslationKey) => string;
  valueType?: "count" | "money";
}) {
  if (!rows.length) return <NoData label={t("noDataAvailable")} />;
  const max = Math.max(...rows.map((row) => row.count ?? row.value ?? 0), 1);
  return (
    <div className="flex h-52 items-end gap-2 overflow-x-auto pb-2">
      {rows.map((row, index) => {
        const value = row.count ?? row.value ?? 0;
        const label = translateLabel(row.label, language, t);
        return (
          <div key={row.label} className="flex min-w-[48px] flex-1 flex-col items-center gap-2" title={`${label}: ${value}`}>
            <span className="text-xs font-semibold">{valueType === "money" ? formatCompact(value, language) : formatNumber(value, language)}</span>
            <div className="flex h-36 w-full items-end rounded-lg bg-[var(--surface-soft)]">
              <div
                className="w-full rounded-lg"
                style={{ height: `${Math.max((value / max) * 100, value > 0 ? 3 : 0)}%`, backgroundColor: chartColors[index % chartColors.length] }}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] text-[var(--muted)]">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function PieChart({
  rows,
  language,
  t,
  doughnut = false
}: {
  rows: ChartDatum[];
  language: Language;
  t: (key: CommonTranslationKey) => string;
  doughnut?: boolean;
}) {
  const total = rows.reduce((sum, row) => sum + (row.count ?? row.value ?? 0), 0);
  if (!rows.length || total <= 0) return <NoData label={t("noDataAvailable")} />;
  let cursor = 0;
  const gradient = rows
    .map((row, index) => {
      const value = row.count ?? row.value ?? 0;
      const start = cursor;
      const end = cursor + (value / total) * 100;
      cursor = end;
      return `${chartColors[index % chartColors.length]} ${start}% ${end}%`;
    })
    .join(", ");
  return (
    <div className="grid gap-4 sm:grid-cols-[160px,1fr]">
      <div className="relative mx-auto h-40 w-40 rounded-full" style={{ background: `conic-gradient(${gradient})` }} title={`${t("totalListings")}: ${total}`}>
        {doughnut ? <div className="absolute inset-9 rounded-full bg-[var(--surface)]" /> : null}
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => {
          const value = row.count ?? row.value ?? 0;
          const label = translateLabel(row.label, language, t);
          return (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm" title={`${label}: ${value}`}>
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                <span className="truncate text-[var(--muted)]">{label}</span>
              </span>
              <span className="font-semibold">{formatNumber(value, language)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function pathFor(points: TrendDatum[], width: number, height: number) {
  const max = Math.max(...points.map((point) => point.count), 1);
  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - (point.count / max) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function LineChart({ points, language, t, area = false }: { points: TrendDatum[]; language: Language; t: (key: CommonTranslationKey) => string; area?: boolean }) {
  if (!points.length) return <NoData label={t("noDataAvailable")} />;
  const width = 360;
  const height = 150;
  const path = pathFor(points, width, height);
  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height + 28}`} className="h-56 w-full overflow-visible">
        {area ? <path d={areaPath} fill="rgba(103,212,229,0.18)" /> : null}
        <path d={path} fill="none" stroke="#67d4e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          const max = Math.max(...points.map((item) => item.count), 1);
          const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
          const y = height - (point.count / max) * height;
          return (
            <circle key={`${point.label}-${index}`} cx={x} cy={y} r="4" fill="#f4c86a">
              <title>{`${point.label}: ${formatNumber(point.count, language)}`}</title>
            </circle>
          );
        })}
        <text x="0" y={height + 22} className="fill-[var(--muted)] text-[10px]">
          {points[0]?.label}
        </text>
        <text x={width} y={height + 22} textAnchor="end" className="fill-[var(--muted)] text-[10px]">
          {points[points.length - 1]?.label}
        </text>
      </svg>
    </div>
  );
}

function MultiLineChart({
  series,
  language,
  t
}: {
  series: Array<{ label: string; points: TrendDatum[]; color: string }>;
  language: Language;
  t: (key: CommonTranslationKey) => string;
}) {
  if (!series.some((item) => item.points.length)) return <NoData label={t("noDataAvailable")} />;
  return (
    <div className="space-y-3">
      <svg viewBox="0 0 360 170" className="h-56 w-full overflow-visible">
        {series.map((item) => (
          <path key={item.label} d={pathFor(item.points, 360, 150)} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <title>{translateLabel(item.label, language, t)}</title>
          </path>
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs">
        {series.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-2 text-[var(--muted)]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            {translateLabel(item.label, language, t)}
          </span>
        ))}
      </div>
    </div>
  );
}

function StackedBarChart({ rows, language, t }: { rows: StackedDatum[]; language: Language; t: (key: CommonTranslationKey) => string }) {
  if (!rows.length) return <NoData label={t("noDataAvailable")} />;
  const max = Math.max(...rows.map((row) => Object.values(row.values).reduce((sum, value) => sum + value, 0)), 1);
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const total = Object.values(row.values).reduce((sum, value) => sum + value, 0);
        return (
          <div key={row.label} title={`${row.label}: ${formatNumber(total, language)}`}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-[var(--muted)]">{row.label}</span>
              <span className="font-semibold">{formatNumber(total, language)}</span>
            </div>
            <div className="flex h-5 overflow-hidden rounded-full bg-[var(--surface-soft)]" style={{ width: `${Math.max((total / max) * 100, total > 0 ? 3 : 0)}%` }}>
              {listingStatuses.map((status, index) => (
                <div
                  key={status}
                  title={`${statusLabel(status, t)}: ${formatNumber(row.values[status] ?? 0, language)}`}
                  style={{
                    width: total ? `${((row.values[status] ?? 0) / total) * 100}%` : "0%",
                    backgroundColor: chartColors[index % chartColors.length]
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-3 text-xs">
        {listingStatuses.map((status, index) => (
          <span key={status} className="inline-flex items-center gap-2 text-[var(--muted)]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
            {statusLabel(status, t)}
          </span>
        ))}
      </div>
    </div>
  );
}

function RadarChart({ rows, language, t }: { rows: ChartDatum[]; language: Language; t: (key: CommonTranslationKey) => string }) {
  const data = rows.slice(0, 7);
  if (!data.length) return <NoData label={t("noDataAvailable")} />;
  const max = Math.max(...data.map((row) => row.count ?? row.value ?? 0), 1);
  const center = 100;
  const radius = 72;
  const points = data
    .map((row, index) => {
      const angle = (Math.PI * 2 * index) / data.length - Math.PI / 2;
      const value = (row.count ?? row.value ?? 0) / max;
      return `${center + Math.cos(angle) * radius * value},${center + Math.sin(angle) * radius * value}`;
    })
    .join(" ");
  return (
    <div className="grid gap-3 sm:grid-cols-[220px,1fr]">
      <svg viewBox="0 0 200 200" className="mx-auto h-52 w-52">
        {[0.35, 0.7, 1].map((scale) => (
          <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="rgba(148,163,184,0.25)" />
        ))}
        {data.map((row, index) => {
          const angle = (Math.PI * 2 * index) / data.length - Math.PI / 2;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          return <line key={row.label} x1={center} y1={center} x2={x} y2={y} stroke="rgba(148,163,184,0.2)" />;
        })}
        <polygon points={points} fill="rgba(103,212,229,0.26)" stroke="#67d4e5" strokeWidth="3" />
      </svg>
      <div className="space-y-2">
        {data.map((row, index) => (
          <div key={row.label} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-[var(--muted)]">{translateLabel(row.label, language, t)}</span>
            <span className="font-semibold">{formatNumber(row.count ?? row.value ?? 0, language)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScatterChart({ points, language, t }: { points: AnalyticsDashboard["charts"]["propertyPriceScatter"]; language: Language; t: (key: CommonTranslationKey) => string }) {
  if (!points.length) return <NoData label={t("noDataAvailable")} />;
  const width = 360;
  const height = 190;
  const maxX = Math.max(...points.map((point) => point.x), 1);
  const maxY = Math.max(...points.map((point) => point.y), 1);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full overflow-visible">
      <line x1="28" y1="8" x2="28" y2="166" stroke="rgba(148,163,184,0.35)" />
      <line x1="28" y1="166" x2="350" y2="166" stroke="rgba(148,163,184,0.35)" />
      {points.map((point, index) => {
        const x = 28 + (point.x / maxX) * 314;
        const y = 166 - (point.y / maxY) * 150;
        return (
          <circle key={`${point.label}-${index}`} cx={x} cy={y} r="4" fill={chartColors[index % chartColors.length]} opacity="0.75">
            <title>{`${point.label} | ${formatNumber(point.x, language)} sqm | ${formatCompact(point.y, language)}`}</title>
          </circle>
        );
      })}
      <text x="28" y="186" className="fill-[var(--muted)] text-[10px]">
        sqm
      </text>
      <text x="350" y="186" textAnchor="end" className="fill-[var(--muted)] text-[10px]">
        {formatNumber(maxX, language)}
      </text>
    </svg>
  );
}

function HeatmapChart({ cells, language, t }: { cells: AnalyticsDashboard["charts"]["activityHeatmap"]; language: Language; t: (key: CommonTranslationKey) => string }) {
  if (!cells.some((cell) => cell.count > 0)) return <NoData label={t("noDataAvailable")} />;
  const max = Math.max(...cells.map((cell) => cell.count), 1);
  const dayFormatter = new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", { weekday: "short" });
  const dayLabels = Array.from({ length: 7 }, (_, day) => dayFormatter.format(new Date(Date.UTC(2024, 0, day + 7))));
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[620px] grid-cols-[56px_repeat(24,minmax(18px,1fr))] gap-1 text-[10px]">
        <div />
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="text-center text-[var(--muted)]">
            {hour}
          </div>
        ))}
        {dayLabels.map((dayLabel, day) => (
          <div key={dayLabel} className="contents">
            <div className="flex items-center text-[var(--muted)]">{dayLabel}</div>
            {Array.from({ length: 24 }, (_, hour) => {
              const cell = cells.find((item) => item.day === day && item.hour === hour);
              const value = cell?.count ?? 0;
              return (
                <div
                  key={`${day}-${hour}`}
                  title={`${dayLabel} ${hour}:00 - ${formatNumber(value, language)}`}
                  className="h-5 rounded"
                  style={{ backgroundColor: `rgba(103, 212, 229, ${0.08 + (value / max) * 0.82})` }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterChecklist({
  label,
  options,
  selected,
  onChange,
  renderLabel
}: {
  label: string;
  options: AnalyticsOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  renderLabel: (option: AnalyticsOption) => string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border theme-divider bg-[var(--surface)] p-2">
        {options.length ? (
          options.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(event) => onChange(updateList(selected, option.value, event.currentTarget.checked))}
              />
              <span className="truncate">{renderLabel(option)}</span>
            </label>
          ))
        ) : (
          <p className="px-1 py-2 text-xs text-[var(--muted)]">-</p>
        )}
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string;
  value?: number;
  placeholder?: string;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label className="space-y-1 text-sm font-semibold">
      {label}
      <input
        type="number"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.currentTarget.value;
          onChange(next === "" ? undefined : Number(next));
        }}
        className="h-10 w-full rounded-xl border theme-divider bg-[var(--surface)] px-3 text-sm outline-none focus:ring focus:ring-brand-300"
      />
    </label>
  );
}

export function AdminAnalyticsClient({ analytics, filters }: { analytics: AnalyticsDashboard; filters: AnalyticsFilters }) {
  const router = useRouter();
  const { language, direction, t } = useLanguage();
  const [dashboard, setDashboard] = useState<AnalyticsDashboard>(analytics);
  const [filterState, setFilterState] = useState<AnalyticsFilters>(filters);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const firstRun = useRef(true);

  const queryString = useMemo(() => filtersToParams(filterState).toString(), [filterState]);
  const activeFilters = useMemo(() => {
    const items: Array<{ key: string; label: string }> = [];
    const addList = (label: string, values: string[], translate = (value: string) => translateLabel(value, language, t)) => {
      values.forEach((value) => items.push({ key: `${label}-${value}`, label: `${label}: ${translate(value)}` }));
    };
    if (filterState.startDate) items.push({ key: "startDate", label: `${t("startDate")}: ${filterState.startDate}` });
    if (filterState.endDate) items.push({ key: "endDate", label: `${t("endDate")}: ${filterState.endDate}` });
    addList(t("cityFilter"), filterState.cities, (value) => translateLocation(value, language));
    addList(t("governorateFilter"), filterState.governorates, (value) => translateLocation(value, language));
    addList(t("propertyTypeFilter"), filterState.propertyTypes);
    addList(t("transactionTypeFilter"), filterState.transactionTypes);
    addList(t("listingStatus"), filterState.listingStatuses);
    addList(t("userTypeFilter"), filterState.userTypes);
    if (filterState.minPrice != null) items.push({ key: "minPrice", label: `${t("minPrice")}: ${formatNumber(filterState.minPrice, language)}` });
    if (filterState.maxPrice != null) items.push({ key: "maxPrice", label: `${t("maxPrice")}: ${formatNumber(filterState.maxPrice, language)}` });
    if (filterState.minAiPrice != null) items.push({ key: "minAiPrice", label: `${t("minAiPrice")}: ${formatNumber(filterState.minAiPrice, language)}` });
    if (filterState.maxAiPrice != null) items.push({ key: "maxAiPrice", label: `${t("maxAiPrice")}: ${formatNumber(filterState.maxAiPrice, language)}` });
    return items;
  }, [filterState, language, t]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasQuery = window.location.search.length > 1;
    if (!hasQuery) {
      const stored = window.localStorage.getItem(FILTER_STORAGE_KEY);
      if (stored) {
        try {
          setFilterState({ ...emptyFilters(), ...JSON.parse(stored) });
        } catch {
          window.localStorage.removeItem(FILTER_STORAGE_KEY);
        }
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const query = queryString ? `?${queryString}` : "";
    window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filterState));
    router.replace(`/admin/analytics${query}`, { scroll: false });
    setLoading(true);
    fetch(`/api/admin/analytics${query}`, { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load analytics");
        return response.json() as Promise<AnalyticsDashboard>;
      })
      .then((payload) => setDashboard(payload))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    firstRun.current = false;
    return () => controller.abort();
  }, [queryString, refreshNonce, ready, router, filterState]);

  function patchFilters(patch: Partial<AnalyticsFilters>) {
    setFilterState((current) => ({ ...current, ...patch }));
  }

  const options = dashboard.filterOptions;
  const totals = dashboard.totals;
  const charts = dashboard.charts;
  const tables = dashboard.tables;

  return (
    <div dir={direction} className={cn("space-y-5", direction === "rtl" ? "text-right" : "text-left")}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-soft text-sm font-semibold uppercase tracking-wide">{t("analyticsDashboardEyebrow")}</p>
            <h1 className="text-2xl font-bold">{t("analyticsDashboardTitle")}</h1>
          </div>
          <button
            type="button"
            onClick={() => setRefreshNonce((value) => value + 1)}
            className="rounded-xl border theme-divider bg-[var(--surface)] px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-soft)]"
          >
            {loading ? t("refreshing") : t("refreshDashboard")}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {adminActionLinks.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition",
                action.primary
                  ? "bg-brand-700 text-white hover:bg-brand-800"
                  : "border theme-divider bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-soft)]"
              )}
            >
              {t(action.labelKey)}
            </Link>
          ))}
        </div>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t("advancedFilters")}</h2>
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem(FILTER_STORAGE_KEY);
              setFilterState(emptyFilters());
            }}
            className="rounded-xl border theme-divider px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-soft)]"
          >
            {t("clearAllFilters")}
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm font-semibold">
            {t("startDate")}
            <input
              type="date"
              value={filterState.startDate ?? ""}
              onChange={(event) => patchFilters({ startDate: event.currentTarget.value || undefined })}
              className="h-10 w-full rounded-xl border theme-divider bg-[var(--surface)] px-3 text-sm outline-none focus:ring focus:ring-brand-300"
            />
          </label>
          <label className="space-y-1 text-sm font-semibold">
            {t("endDate")}
            <input
              type="date"
              value={filterState.endDate ?? ""}
              onChange={(event) => patchFilters({ endDate: event.currentTarget.value || undefined })}
              className="h-10 w-full rounded-xl border theme-divider bg-[var(--surface)] px-3 text-sm outline-none focus:ring focus:ring-brand-300"
            />
          </label>
          <NumberInput label={t("minPrice")} value={filterState.minPrice} placeholder={options.priceRange.min?.toString()} onChange={(value) => patchFilters({ minPrice: value })} />
          <NumberInput label={t("maxPrice")} value={filterState.maxPrice} placeholder={options.priceRange.max?.toString()} onChange={(value) => patchFilters({ maxPrice: value })} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterChecklist label={t("cityFilter")} options={options.cities} selected={filterState.cities} onChange={(cities) => patchFilters({ cities })} renderLabel={(option) => translateLocation(option.label, language)} />
          <FilterChecklist label={t("governorateFilter")} options={options.governorates} selected={filterState.governorates} onChange={(governorates) => patchFilters({ governorates })} renderLabel={(option) => translateLocation(option.label, language)} />
          <FilterChecklist label={t("propertyTypeFilter")} options={options.propertyTypes} selected={filterState.propertyTypes} onChange={(propertyTypes) => patchFilters({ propertyTypes: propertyTypes as PropertyType[] })} renderLabel={(option) => translateLabel(option.value, language, t)} />
          <FilterChecklist label={t("transactionTypeFilter")} options={options.transactionTypes} selected={filterState.transactionTypes} onChange={(transactionTypes) => patchFilters({ transactionTypes: transactionTypes as TransactionType[] })} renderLabel={(option) => translateLabel(option.value, language, t)} />
          <FilterChecklist label={t("listingStatus")} options={options.listingStatuses} selected={filterState.listingStatuses} onChange={(listingStatusesValue) => patchFilters({ listingStatuses: listingStatusesValue as ListingStatus[] })} renderLabel={(option) => translateLabel(option.value, language, t)} />
          <FilterChecklist label={t("sellerFilter")} options={options.sellers} selected={filterState.sellerIds} onChange={(sellerIds) => patchFilters({ sellerIds })} renderLabel={(option) => option.label} />
          <FilterChecklist label={t("developerFilter")} options={options.developers} selected={filterState.developerIds} onChange={(developerIds) => patchFilters({ developerIds })} renderLabel={(option) => option.label} />
          <FilterChecklist label={t("buyerFilter")} options={options.buyers} selected={filterState.buyerIds} onChange={(buyerIds) => patchFilters({ buyerIds })} renderLabel={(option) => option.label} />
          <FilterChecklist label={t("userTypeFilter")} options={options.userTypes} selected={filterState.userTypes} onChange={(userTypes) => patchFilters({ userTypes: userTypes as AnalyticsFilters["userTypes"] })} renderLabel={(option) => translateLabel(option.value, language, t)} />
          <NumberInput label={t("minAiPrice")} value={filterState.minAiPrice} placeholder={options.aiPriceRange.min?.toString()} onChange={(value) => patchFilters({ minAiPrice: value })} />
          <NumberInput label={t("maxAiPrice")} value={filterState.maxAiPrice} placeholder={options.aiPriceRange.max?.toString()} onChange={(value) => patchFilters({ maxAiPrice: value })} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">{t("activeFilters")}</p>
          <div className="flex flex-wrap gap-2">
            {activeFilters.length ? (
              activeFilters.map((item) => (
                <span key={item.key} className="rounded-full border theme-divider bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                  {item.label}
                </span>
              ))
            ) : (
              <span className="text-sm text-[var(--muted)]">{t("noActiveFilters")}</span>
            )}
          </div>
          <p className="text-xs text-[var(--muted)]">
            {t("lastUpdated")}: {formatDate(dashboard.generatedAt, language)}
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("totalUsers")} value={formatNumber(totals.totalUsers, language)} />
        <KpiCard label={t("totalBuyers")} value={formatNumber(totals.totalBuyers, language)} />
        <KpiCard label={t("totalSellers")} value={formatNumber(totals.totalSellers, language)} />
        <KpiCard label={t("totalDevelopers")} value={formatNumber(totals.totalDevelopers, language)} />
        <KpiCard label={t("totalProperties")} value={formatNumber(totals.totalProperties, language)} />
        <KpiCard label={t("totalListings")} value={formatNumber(totals.totalListings, language)} />
        <KpiCard label={t("pendingListingsMetric")} value={formatNumber(totals.pendingListings, language)} />
        <KpiCard label={t("approvedListingsMetric")} value={formatNumber(totals.approvedListings, language)} />
        <KpiCard label={t("rejectedListingsMetric")} value={formatNumber(totals.rejectedListings, language)} />
        <KpiCard label={t("totalSoldProperties")} value={formatNumber(totals.totalSoldProperties, language)} />
        <KpiCard label={t("totalSoldRevenueValue")} value={formatPrice(totals.totalSoldRevenueValue, "EGP", language)} />
        <KpiCard
          label={t("averageDaysUntilSale")}
          value={totals.averageDaysUntilSale == null ? "-" : `${formatNumber(totals.averageDaysUntilSale, language)} ${t("daysUnit")}`}
        />
        <KpiCard label={t("totalPriceEstimates")} value={formatNumber(totals.totalPriceEstimates, language)} />
        <KpiCard label={t("totalSearches")} value={formatNumber(totals.totalSearches, language)} />
        <KpiCard label={t("approvalRate")} value={formatPercent(totals.approvalRate, language)} />
      </div>

      <SectionTitle>{t("soldPropertyAnalytics")}</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title={t("soldPropertiesPerMonth")}>
          <LineChart points={charts.soldPropertiesPerMonth} language={language} t={t} area />
        </ChartCard>
        <ChartCard title={t("soldPropertiesPerYear")}>
          <VerticalBarChart rows={charts.soldPropertiesPerYear} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("soldValueByMonth")}>
          <VerticalBarChart rows={charts.soldValueByMonth} language={language} t={t} valueType="money" />
        </ChartCard>
        <ChartCard title={t("soldPropertiesByCity")}>
          <HorizontalBarChart rows={charts.soldPropertiesByCity} language={language} t={t} onSelect={(city) => patchFilters({ cities: updateList(filterState.cities, city, true) })} />
        </ChartCard>
        <ChartCard title={t("soldPropertiesByGovernorate")}>
          <VerticalBarChart rows={charts.soldPropertiesByGovernorate} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("soldPropertiesByType")}>
          <RadarChart rows={charts.soldPropertiesByType} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("soldPropertiesByDeveloper")}>
          <HorizontalBarChart rows={charts.soldPropertiesByDeveloper} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("soldPropertiesBySeller")}>
          <HorizontalBarChart rows={charts.soldPropertiesBySeller} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("fastestSellingPropertyTypes")}>
          <HorizontalBarChart rows={charts.fastestSellingPropertyTypes} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("highestSellingCities")}>
          <HorizontalBarChart rows={charts.highestSellingCities} language={language} t={t} />
        </ChartCard>
      </div>

      <SectionTitle>{t("propertyAnalytics")}</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title={t("propertiesByCity")} className="lg:col-span-2">
          <HorizontalBarChart rows={charts.propertiesByCity} language={language} t={t} onSelect={(city) => patchFilters({ cities: updateList(filterState.cities, city, true) })} />
        </ChartCard>
        <ChartCard title={t("propertiesByTransaction")}>
          <PieChart rows={charts.propertiesByTransaction} language={language} t={t} doughnut />
        </ChartCard>
        <ChartCard title={t("propertiesByGovernorate")}>
          <VerticalBarChart rows={charts.propertiesByGovernorate} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("propertiesByType")}>
          <RadarChart rows={charts.propertiesByType} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("averagePriceByCity")}>
          <HorizontalBarChart rows={charts.averagePriceByCity} language={language} t={t} valueType="money" />
        </ChartCard>
        <ChartCard title={t("averagePriceByPropertyType")}>
          <VerticalBarChart rows={charts.averagePriceByPropertyType} language={language} t={t} valueType="money" />
        </ChartCard>
        <ChartCard title={t("priceAreaScatter")} className="lg:col-span-2">
          <ScatterChart points={charts.propertyPriceScatter} language={language} t={t} />
        </ChartCard>
      </div>

      <SectionTitle>{t("performanceAnalytics")}</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title={t("listingsByStatus")}>
          <PieChart rows={charts.listingsByStatus} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("listingConversionFunnel")}>
          <HorizontalBarChart rows={charts.listingConversionFunnel} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("systemActivityOverview")}>
          <HorizontalBarChart rows={charts.systemActivityOverview} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("listingStatusPerMonth")} className="lg:col-span-2">
          <StackedBarChart rows={charts.listingStatusPerMonth} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("totalPropertiesGrowth")}>
          <LineChart points={charts.totalPropertiesGrowth} language={language} t={t} area />
        </ChartCard>
      </div>

      <SectionTitle>{t("userAnalytics")}</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title={t("userRoleMix")}>
          <PieChart rows={charts.userRoleMix} language={language} t={t} doughnut />
        </ChartCard>
        <ChartCard title={t("activeVsInactiveUsers")}>
          <HorizontalBarChart rows={charts.activeVsInactiveUsers} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("userRegistrationSources")}>
          <PieChart rows={charts.userRegistrationSources} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("newUsersPerMonth")}>
          <VerticalBarChart rows={charts.newUsersPerMonth} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("userGrowthTrend")} className="lg:col-span-2">
          <LineChart points={charts.userGrowthTrend} language={language} t={t} area />
        </ChartCard>
      </div>

      <SectionTitle>{t("activityAnalytics")}</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title={t("listingsCreatedPerMonth")}>
          <LineChart points={charts.listingsCreatedPerMonth} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("dailyActivityTrend")}>
          <LineChart points={charts.dailyActivityTrend} language={language} t={t} area />
        </ChartCard>
        <ChartCard title={t("activityHeatmap")} className="lg:col-span-3">
          <HeatmapChart cells={charts.activityHeatmap} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("monthlyActivityTrend")} className="lg:col-span-3">
          <MultiLineChart
            language={language}
            t={t}
            series={[
              { label: "dailyActivityTrend", points: charts.dailyActivityTrend, color: "#67d4e5" },
              { label: "weeklyActivityTrend", points: charts.weeklyActivityTrend, color: "#f4c86a" },
              { label: "monthlyActivityTrend", points: charts.monthlyActivityTrend, color: "#8bd17c" }
            ]}
          />
        </ChartCard>
      </div>

      <SectionTitle>{t("aiPriceAnalytics")}</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title={t("aiPredictionsPerDay")}>
          <LineChart points={charts.aiPredictionsPerDay} language={language} t={t} area />
        </ChartCard>
        <ChartCard title={t("aiPredictionsPerMonth")}>
          <VerticalBarChart rows={charts.aiPredictionsPerMonth} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("aiUsageTrend")}>
          <LineChart points={charts.aiUsageTrend} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("averagePredictedPriceByCity")}>
          <HorizontalBarChart rows={charts.averagePredictedPriceByCity} language={language} t={t} valueType="money" />
        </ChartCard>
        <ChartCard title={t("averagePredictedPriceByPropertyType")}>
          <VerticalBarChart rows={charts.averagePredictedPriceByPropertyType} language={language} t={t} valueType="money" />
        </ChartCard>
        <ChartCard title={t("highestPredictedPriceAreas")}>
          <HorizontalBarChart rows={charts.highestPredictedPriceAreas} language={language} t={t} valueType="money" />
        </ChartCard>
      </div>

      <SectionTitle>{t("searchAnalytics")}</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title={t("mostSearchedCities")}>
          <HorizontalBarChart rows={charts.mostSearchedCities} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("mostSearchedPropertyTypes")}>
          <RadarChart rows={charts.mostSearchedPropertyTypes} language={language} t={t} />
        </ChartCard>
        <ChartCard title={t("searchRequestsPerDay")}>
          <LineChart points={charts.searchRequestsPerDay} language={language} t={t} area />
        </ChartCard>
        <ChartCard title={t("searchActivityTrend")} className="lg:col-span-3">
          <LineChart points={charts.searchActivityTrend} language={language} t={t} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-bold">{t("mostViewedProperties")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">{t("propertyColumn")}</th>
                  <th className="py-2">{t("locationColumn")}</th>
                  <th className="py-2 text-end">{t("viewsColumn")}</th>
                </tr>
              </thead>
              <tbody>
                {tables.mostViewedProperties.length > 0 ? (
                  tables.mostViewedProperties.map((property) => (
                    <tr key={property.propertyId} className="border-t theme-divider">
                      <td className="py-2">
                        <Link href={`/p/${property.propertyId}`} className="font-semibold hover:text-[var(--brand)]">
                          {propertyTitle(property, language)}
                        </Link>
                      </td>
                      <td className="py-2 text-[var(--muted)]">
                        {translateLocation(property.city, language)}, {translateLocation(property.area, language)}
                      </td>
                      <td className="py-2 text-end font-semibold">{formatNumber(property.count, language)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-3 text-center text-sm text-[var(--muted)]">
                      {t("noDataAvailable")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold">{t("mostFavoritedProperties")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">{t("propertyColumn")}</th>
                  <th className="py-2">{t("priceColumn")}</th>
                  <th className="py-2 text-end">{t("favoritesColumn")}</th>
                </tr>
              </thead>
              <tbody>
                {tables.mostFavoritedProperties.length > 0 ? (
                  tables.mostFavoritedProperties.map((property) => (
                    <tr key={property.propertyId} className="border-t theme-divider">
                      <td className="py-2">
                        <Link href={`/p/${property.propertyId}`} className="font-semibold hover:text-[var(--brand)]">
                          {propertyTitle(property, language)}
                        </Link>
                      </td>
                      <td className="py-2 text-[var(--muted)]">{formatPrice(property.price, property.currency, language)}</td>
                      <td className="py-2 text-end font-semibold">{formatNumber(property.count, language)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-3 text-center text-sm text-[var(--muted)]">
                      {t("noDataAvailable")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

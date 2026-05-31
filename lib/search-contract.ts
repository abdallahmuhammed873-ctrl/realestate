import { z } from "zod";
import type { SearchFilters } from "./types.ts";

const propertyTypeEnum = z.enum([
  "APARTMENT",
  "VILLA",
  "DUPLEX",
  "PENTHOUSE",
  "CHALET",
  "LAND",
  "COMMERCIAL"
]);

const transactionEnum = z.enum(["BUY", "RENT", "VACATION"]);
const paymentTypeEnum = z.enum(["CASH", "INSTALLMENTS"]);
const furnishingEnum = z.enum(["FULLY", "SEMI", "UNFURNISHED"]);
const completionStatusEnum = z.enum(["OFF_PLAN", "READY"]);
const sortEnum = z.enum(["FEATURED", "NEWEST", "PRICE_ASC", "PRICE_DESC", "AREA_DESC", "DISTANCE_ASC"]);

function parseString(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (Array.isArray(value)) return parseNumber(value[0]);
  return value;
}

function parseBoolean(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  if (Array.isArray(value)) return parseBoolean(value[0]);
  return value;
}

function parseStringArray(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [value];
  const cleaned = values
    .map((item) => (typeof item === "string" ? item.trim() : String(item)))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}

const searchFiltersShape = {
  q: z.preprocess(parseString, z.string().min(1).optional()),
  transaction: z.preprocess(parseString, transactionEnum.optional()),
  type: z.preprocess(parseStringArray, z.array(propertyTypeEnum).min(1).optional()),
  city: z.preprocess(parseString, z.string().min(1).optional()),
  area: z.preprocess(parseString, z.string().min(1).optional()),
  district: z.preprocess(parseString, z.string().min(1).optional()),
  projectName: z.preprocess(parseString, z.string().min(1).optional()),
  minPrice: z.preprocess(parseNumber, z.number().finite().nonnegative().optional()),
  maxPrice: z.preprocess(parseNumber, z.number().finite().nonnegative().optional()),
  minArea: z.preprocess(parseNumber, z.number().finite().nonnegative().optional()),
  maxArea: z.preprocess(parseNumber, z.number().finite().nonnegative().optional()),
  minBeds: z.preprocess(parseNumber, z.number().int().nonnegative().optional()),
  maxBeds: z.preprocess(parseNumber, z.number().int().nonnegative().optional()),
  minBaths: z.preprocess(parseNumber, z.number().int().nonnegative().optional()),
  maxBaths: z.preprocess(parseNumber, z.number().int().nonnegative().optional()),
  paymentType: z.preprocess(parseString, paymentTypeEnum.optional()),
  furnishing: z.preprocess(parseString, furnishingEnum.optional()),
  completionStatus: z.preprocess(parseString, completionStatusEnum.optional()),
  hasGarden: z.preprocess(parseBoolean, z.boolean().optional()),
  hasRoof: z.preprocess(parseBoolean, z.boolean().optional()),
  has360View: z.preprocess(parseBoolean, z.boolean().optional()),
  amenities: z.preprocess(parseStringArray, z.array(z.string().min(1)).min(1).optional()),
  lat: z.preprocess(parseNumber, z.number().finite().optional()),
  lng: z.preprocess(parseNumber, z.number().finite().optional()),
  distanceKm: z.preprocess(parseNumber, z.number().finite().nonnegative().optional()),
  downPaymentMax: z.preprocess(parseNumber, z.number().finite().nonnegative().optional()),
  installmentYearsMax: z.preprocess(parseNumber, z.number().finite().nonnegative().optional()),
  installmentMonthlyMax: z.preprocess(parseNumber, z.number().finite().nonnegative().optional()),
  unitCode: z.preprocess(parseString, z.string().min(1).optional()),
  inventoryStatus: z.preprocess(parseString, z.string().min(1).optional()),
  sort: z.preprocess(parseString, sortEnum.default("FEATURED")),
  page: z.preprocess(parseNumber, z.number().int().min(1).max(1000).default(1)),
  pageSize: z.preprocess(parseNumber, z.number().int().min(1).max(50).default(20))
} satisfies z.ZodRawShape;

const sharedSearchFiltersObjectSchema = z.object(searchFiltersShape).strict();

function addSharedSearchValidation(
  value: z.infer<typeof sharedSearchFiltersObjectSchema>,
  ctx: z.RefinementCtx
) {
    const rangePairs: Array<[keyof SearchFilters, keyof SearchFilters]> = [
      ["minPrice", "maxPrice"],
      ["minArea", "maxArea"],
      ["minBeds", "maxBeds"],
      ["minBaths", "maxBaths"]
    ];

    for (const [minKey, maxKey] of rangePairs) {
      const minimum = value[minKey];
      const maximum = value[maxKey];
      if (typeof minimum === "number" && typeof maximum === "number" && minimum > maximum) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${String(minKey)} cannot be greater than ${String(maxKey)}`,
          path: [minKey]
        });
      }
    }

    if ((value.lat !== undefined) !== (value.lng !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "lat and lng must be provided together",
        path: value.lat === undefined ? ["lat"] : ["lng"]
      });
    }

    if (value.distanceKm !== undefined && (value.lat === undefined || value.lng === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "distanceKm requires both lat and lng",
        path: ["distanceKm"]
      });
    }

    if (value.sort === "DISTANCE_ASC" && (value.lat === undefined || value.lng === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DISTANCE_ASC sort requires both lat and lng",
        path: ["sort"]
      });
    }
}

export const sharedSearchFiltersSchema = sharedSearchFiltersObjectSchema.superRefine(addSharedSearchValidation);

export const publicSearchFiltersSchema = sharedSearchFiltersObjectSchema
  .omit({
    unitCode: true,
    inventoryStatus: true
  })
  .superRefine(addSharedSearchValidation);

export const internalAiSearchFiltersSchema = sharedSearchFiltersSchema;

export type SharedSearchFilters = z.infer<typeof sharedSearchFiltersSchema>;

export function parsePublicSearchFilters(input: unknown) {
  return publicSearchFiltersSchema.parse(input);
}

export function parseInternalAiSearchFilters(input: unknown) {
  return internalAiSearchFiltersSchema.parse(input);
}

export function safeParsePublicSearchFilters(input: unknown) {
  return publicSearchFiltersSchema.safeParse(input);
}

export function safeParseInternalAiSearchFilters(input: unknown) {
  return internalAiSearchFiltersSchema.safeParse(input);
}

export function toSearchParams(filters: Partial<SharedSearchFilters>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
      return;
    }
    params.set(key, String(value));
  });
  return params.toString();
}

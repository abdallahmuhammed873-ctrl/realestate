import { z } from "zod";
import type { NextRequest } from "next/server";
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
const completionStatusEnum = z.enum(["OFF_PLAN", "READY"]);
const sortEnum = z.enum(["FEATURED", "NEWEST", "PRICE_ASC", "PRICE_DESC", "AREA_DESC", "DISTANCE_ASC"]);

export const aiLanguageSchema = z.enum(["EN", "AR"]).default("EN");

export const aiPropertySearchSchema = z
  .object({
    q: z.string().trim().min(1).optional(),
    transaction: transactionEnum.optional(),
    type: z.array(propertyTypeEnum).min(1).optional(),
    city: z.string().trim().min(1).optional(),
    area: z.string().trim().min(1).optional(),
    district: z.string().trim().min(1).optional(),
    projectName: z.string().trim().min(1).optional(),
    minPrice: z.number().finite().nonnegative().optional(),
    maxPrice: z.number().finite().nonnegative().optional(),
    minArea: z.number().finite().nonnegative().optional(),
    maxArea: z.number().finite().nonnegative().optional(),
    minBeds: z.number().int().nonnegative().optional(),
    maxBeds: z.number().int().nonnegative().optional(),
    minBaths: z.number().int().nonnegative().optional(),
    maxBaths: z.number().int().nonnegative().optional(),
    paymentType: paymentTypeEnum.optional(),
    completionStatus: completionStatusEnum.optional(),
    hasGarden: z.boolean().optional(),
    hasRoof: z.boolean().optional(),
    downPaymentMax: z.number().finite().nonnegative().optional(),
    installmentYearsMax: z.number().finite().nonnegative().optional(),
    installmentMonthlyMax: z.number().finite().nonnegative().optional(),
    unitCode: z.string().trim().min(1).optional(),
    inventoryStatus: z.string().trim().min(1).optional(),
    sort: sortEnum.optional(),
    page: z.number().int().min(1).max(1000).optional(),
    pageSize: z.number().int().min(1).max(50).optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minPrice cannot be greater than maxPrice",
        path: ["minPrice"]
      });
    }

    if (value.minArea !== undefined && value.maxArea !== undefined && value.minArea > value.maxArea) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minArea cannot be greater than maxArea",
        path: ["minArea"]
      });
    }

    if (value.minBeds !== undefined && value.maxBeds !== undefined && value.minBeds > value.maxBeds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minBeds cannot be greater than maxBeds",
        path: ["minBeds"]
      });
    }

    if (value.minBaths !== undefined && value.maxBaths !== undefined && value.minBaths > value.maxBaths) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minBaths cannot be greater than maxBaths",
        path: ["minBaths"]
      });
    }
  });

export const aiExtractFiltersRequestSchema = z
  .object({
    message: z.string().trim().min(1),
    language: aiLanguageSchema.optional()
  })
  .strict();

export const aiChatRequestSchema = z
  .object({
    message: z.string().trim().min(1),
    language: aiLanguageSchema.optional()
  })
  .strict();

export type AiPropertySearchFilters = z.infer<typeof aiPropertySearchSchema> & SearchFilters;
export type AiLanguage = z.infer<typeof aiLanguageSchema>;

export function getInternalAiKey() {
  return process.env.AI_INTERNAL_API_KEY?.trim() || "dev-ai-internal-key";
}

export function isAuthorizedInternalAiRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length) === getInternalAiKey();
  }

  return req.headers.get("x-ai-internal-key") === getInternalAiKey();
}

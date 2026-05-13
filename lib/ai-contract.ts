import { z } from "zod";
import type { NextRequest } from "next/server";
import {
  internalAiSearchFiltersSchema,
  type SharedSearchFilters,
  safeParseInternalAiSearchFilters
} from "./search-contract.ts";

export const aiLanguageSchema = z.enum(["EN", "AR"]).default("EN");
export const aiPropertySearchSchema = internalAiSearchFiltersSchema;

export const aiExtractFiltersRequestSchema = z
  .object({
    message: z.string().trim().min(1),
    language: aiLanguageSchema.optional()
  })
  .strict();

export const aiChatHistoryItemSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1)
  })
  .strict();

export const aiChatRequestSchema = z
  .object({
    message: z.string().trim().min(1),
    language: aiLanguageSchema.optional(),
    history: z.array(aiChatHistoryItemSchema).max(12).optional()
  })
  .strict();

export type AiPropertySearchFilters = SharedSearchFilters;
export type AiLanguage = z.infer<typeof aiLanguageSchema>;
export { safeParseInternalAiSearchFilters };

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

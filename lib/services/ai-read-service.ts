import { parseInternalAiSearchFilters } from "../search-contract.ts";
import type { SearchFilters } from "../types.ts";
import { getPublicPropertyById } from "./property-service.ts";
import { searchPropertyCards } from "../server/repository-helpers.ts";

export async function searchAiReadableProperties(filters: SearchFilters) {
  return searchPropertyCards(parseInternalAiSearchFilters(filters));
}

export async function getAiReadablePropertyById(propertyId: string) {
  return getPublicPropertyById(propertyId);
}

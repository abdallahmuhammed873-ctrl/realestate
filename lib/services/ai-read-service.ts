import { searchProperties, getPublicPropertyById } from "./property-service.ts";

export async function searchAiReadableProperties(filters: Parameters<typeof searchProperties>[0]) {
  return searchProperties(filters);
}

export async function getAiReadablePropertyById(propertyId: string) {
  return getPublicPropertyById(propertyId);
}

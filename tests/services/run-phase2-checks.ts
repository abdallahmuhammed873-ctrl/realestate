import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { toMobilePropertySearchResponse } from "../../lib/mobile-api.ts";
import { parseInternalAiSearchFilters, parsePublicSearchFilters, toSearchParams } from "../../lib/search-contract.ts";
import { getGeminiFallbackModels, getGeminiModelCandidates } from "../../lib/server/ai-config.ts";
import { extractAiFilters, relaxAiFilters } from "../../lib/server/ai-filters.ts";
import { loadLocalEnv } from "../../lib/server/load-env.ts";
import { IMPORTED_INVENTORY_OWNER_ID, upsertImportedInventory } from "../../prisma/import-ai-inventory.ts";
import { importRuntimeData } from "../../prisma/import-runtime-data.ts";
import {
  buyerSelectAppointmentSlot,
  createAppointment,
  createOrUpdateSellerListing,
  createSavedSearch,
  listFavorites,
  searchAiReadableProperties,
  searchProperties,
  toggleFavorite,
  updateListingStatus,
  updateSellerAppointment
} from "../../lib/repository.ts";

loadLocalEnv();

const prisma = new PrismaClient();

async function resetData() {
  await importRuntimeData(prisma);
}

async function main() {
  await resetData();

  const originalGeminiModel = process.env.GEMINI_MODEL;
  const originalGeminiFallbackModel = process.env.GEMINI_FALLBACK_MODEL;
  const originalGeminiFallbackModels = process.env.GEMINI_FALLBACK_MODELS;
  try {
    process.env.GEMINI_MODEL = "gemini-3.5-flash";
    delete process.env.GEMINI_FALLBACK_MODEL;
    delete process.env.GEMINI_FALLBACK_MODELS;
    assert.deepEqual(
      getGeminiFallbackModels(),
      ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
      "Expected Gemini fallback models to default to current 2.5 Flash models"
    );

    process.env.GEMINI_FALLBACK_MODELS = "gemini-2.5-flash, gemini-2.5-flash-lite, gemini-3.5-flash";
    assert.deepEqual(
      getGeminiModelCandidates(),
      ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
      "Expected Gemini model candidates to keep primary first and remove duplicate fallback entries"
    );
  } finally {
    if (originalGeminiModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalGeminiModel;
    if (originalGeminiFallbackModel === undefined) delete process.env.GEMINI_FALLBACK_MODEL;
    else process.env.GEMINI_FALLBACK_MODEL = originalGeminiFallbackModel;
    if (originalGeminiFallbackModels === undefined) delete process.env.GEMINI_FALLBACK_MODELS;
    else process.env.GEMINI_FALLBACK_MODELS = originalGeminiFallbackModels;
  }

  const parsedPublic = parsePublicSearchFilters({
    type: "APARTMENT,VILLA",
    city: "Cairo",
    minPrice: "1000000",
    maxPrice: "5000000",
    page: "2",
    pageSize: "12",
    sort: "PRICE_ASC"
  });
  assert.deepEqual(parsedPublic.type, ["APARTMENT", "VILLA"], "Expected shared contract to parse comma-separated types");
  assert.equal(parsedPublic.page, 2, "Expected shared contract to normalize public page");
  assert.equal(parsedPublic.pageSize, 12, "Expected shared contract to normalize public page size");

  const parsedInternal = parseInternalAiSearchFilters({
    unitCode: "AL-TEST-01",
    inventoryStatus: "Available",
    page: 1,
    pageSize: 5
  });
  assert.equal(parsedInternal.unitCode, "AL-TEST-01", "Expected internal AI contract to keep unitCode");
  assert.equal(parsedInternal.inventoryStatus, "Available", "Expected internal AI contract to keep inventoryStatus");

  const serialized = toSearchParams({ city: "Cairo", type: ["APARTMENT", "VILLA"], page: 3 });
  assert.match(serialized, /city=Cairo/, "Expected shared contract serializer to keep city");
  assert.match(serialized, /type=APARTMENT%2CVILLA/, "Expected shared contract serializer to keep type lists");

  const noLocalFallbackFilters = extractAiFilters("Find me a waterfront villa in El Gouna under 2 million EGP").filters;
  assert.equal(noLocalFallbackFilters.q, "el gouna", "Expected AI extraction to keep unresolved location text searchable");
  assert.deepEqual(noLocalFallbackFilters.type, ["VILLA"], "Expected AI extraction to keep the requested property type");
  const relaxedNoLocalFallbackFilters = relaxAiFilters(noLocalFallbackFilters);
  assert.deepEqual(
    relaxedNoLocalFallbackFilters.relaxedKeys,
    ["maxPrice"],
    "Expected AI relaxation to only soften budget before external/no-results fallback"
  );
  assert.equal(
    relaxAiFilters(relaxedNoLocalFallbackFilters.filters, relaxedNoLocalFallbackFilters.relaxedKeys).relaxedKeys.length,
    0,
    "Expected AI relaxation to preserve core type/location criteria instead of returning unrelated local properties"
  );

  const searchResult = await searchProperties({ page: 1, pageSize: 10 });
  assert.ok(searchResult.total > 0, "Expected approved properties to be searchable");
  assert.ok(searchResult.items.every((item) => item.listingStatus === "APPROVED"));

  const propertyId = searchResult.items[0]?.id;
  assert.ok(propertyId, "Expected at least one searchable property");

  let savedFavorite = await toggleFavorite("u-buyer-1", propertyId);
  if (!savedFavorite.saved) {
    savedFavorite = await toggleFavorite("u-buyer-1", propertyId);
  }
  assert.equal(savedFavorite.saved, true, "Expected favorite to be created");
  const favorites = await listFavorites("u-buyer-1");
  assert.ok(favorites.some((item) => item.id === propertyId), "Expected favorite list to include saved property");
  const removedFavorite = await toggleFavorite("u-buyer-1", propertyId);
  assert.equal(removedFavorite.saved, false, "Expected favorite to be removed");

  const appointment = await createAppointment({
    userId: "u-buyer-1",
    propertyId,
    datetime: "2026-05-14T10:00:00.000Z",
    contactName: "Buyer Test",
    contactPhone: "01123456789",
    notes: "Please confirm",
    suggestedSlots: []
  });

  const sellerId = searchResult.items[0]!.sellerId;
  const rescheduled = await updateSellerAppointment(appointment.id, sellerId, {
    action: "RESCHEDULE",
    slots: ["2026-05-15T10:00:00.000Z", "2026-05-15T12:00:00.000Z"]
  });
  assert.equal(rescheduled?.status, "RESCHEDULED", "Expected seller reschedule flow to work");

  const selected = await buyerSelectAppointmentSlot(appointment.id, "u-buyer-1", "2026-05-15T12:00:00.000Z");
  assert.equal(selected?.status, "PENDING", "Expected buyer slot selection to reset appointment to pending");

  const createdListing = await createOrUpdateSellerListing({
    sellerId: "u-seller-1",
    feesPaid: true,
    property: {
      title: "Phase 2 Service Test Listing",
      description: "Created from the Prisma-backed listing service",
      transaction: "BUY",
      type: "APARTMENT",
      price: 3500000,
      rentPrice: null,
      currency: "EGP",
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 160,
      lat: 30.0444,
      lng: 31.2357,
      address: "Test Address",
      city: "Cairo",
      area: "New Cairo",
      district: "Fifth Settlement",
      furnishing: "SEMI",
      paymentType: "CASH",
      completionStatus: "READY",
      amenities: ["Parking"],
      images: ["/test.jpg"]
    }
  });

  assert.equal(createdListing?.listing.status, "PENDING", "Expected seller listing submission to create pending listing");
  const approvedListing = await updateListingStatus(createdListing!.listing.id, "APPROVED", "u-admin-1", "Looks good");
  assert.equal(approvedListing?.status, "APPROVED", "Expected admin approval flow to update listing status");

  const approvedSearch = await searchProperties({ q: "Phase 2 Service Test Listing", page: 1, pageSize: 10 });
  assert.ok(
    approvedSearch.items.some((item) => item.id === createdListing?.property.id),
    "Expected approved seller listing to appear in search"
  );
  await updateListingStatus(createdListing!.listing.id, "REJECTED", "u-admin-1", "Service test cleanup");

  const phase13Title = "Phase 13 Visibility Gate Listing";
  const phase13Listing = await createOrUpdateSellerListing({
    sellerId: "u-seller-1",
    feesPaid: true,
    property: {
      title: phase13Title,
      description: "Listing used to verify approval-state visibility across runtime surfaces",
      projectName: "Crescent Heights",
      unitCode: "CH-1301",
      inventoryStatus: "Available",
      sourceType: "IMPORTED",
      transaction: "BUY",
      type: "APARTMENT",
      price: 4100000,
      rentPrice: null,
      currency: "EGP",
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 170,
      lat: 30.0444,
      lng: 31.2357,
      address: "Phase 13 Test Address",
      city: "Cairo",
      area: "New Cairo",
      district: "Lotus",
      furnishing: "SEMI",
      paymentType: "CASH",
      completionStatus: "READY",
      amenities: ["Parking", "Clubhouse"],
      images: ["/phase13-cover.jpg"]
    }
  });
  assert.equal(phase13Listing?.property.sourceType, "MANUAL", "Expected seller flow to keep manual inventory source");
  assert.equal(phase13Listing?.property.inventoryStatus, null, "Expected seller flow to ignore imported-only inventory status");
  assert.equal(phase13Listing?.property.projectName, "Crescent Heights", "Expected project name to persist through seller flow");
  assert.equal(phase13Listing?.property.unitCode, "CH-1301", "Expected unit code to persist through seller flow");

  const pendingVisibility = await searchProperties({ q: phase13Title, page: 1, pageSize: 10 });
  assert.ok(
    pendingVisibility.items.every((item) => item.id !== phase13Listing?.property.id),
    "Expected pending seller listing to stay hidden from public website search"
  );

  const mobilePendingBody = toMobilePropertySearchResponse(pendingVisibility, "http://127.0.0.1:3000");
  assert.ok(
    mobilePendingBody.items.every((item: { id: string }) => item.id !== phase13Listing?.property.id),
    "Expected pending seller listing to stay hidden from mobile property search"
  );

  const aiPendingBody = await searchAiReadableProperties({ q: phase13Title, page: 1, pageSize: 10 });
  assert.ok(
    aiPendingBody.items.every((item: { id: string }) => item.id !== phase13Listing?.property.id),
    "Expected pending seller listing to stay hidden from AI retrieval"
  );

  await updateListingStatus(phase13Listing!.listing.id, "APPROVED", "u-admin-1", "Ready for publishing");

  const approvedVisibility = await searchProperties({ q: phase13Title, page: 1, pageSize: 10 });
  assert.ok(
    approvedVisibility.items.some((item) => item.id === phase13Listing?.property.id),
    "Expected approved seller listing to appear in public website search"
  );

  const mobileApprovedBody = toMobilePropertySearchResponse(approvedVisibility, "http://127.0.0.1:3000");
  assert.ok(
    mobileApprovedBody.items.some(
      (item: { id: string; projectName: string | null; unitCode: string | null }) =>
        item.id === phase13Listing?.property.id && item.projectName === "Crescent Heights" && item.unitCode === "CH-1301"
    ),
    "Expected approved seller listing to appear in mobile property search with project/unit metadata"
  );

  const aiApprovedBody = await searchAiReadableProperties({ q: phase13Title, page: 1, pageSize: 10 });
  assert.ok(
    aiApprovedBody.items.some((item: { id: string }) => item.id === phase13Listing?.property.id),
    "Expected approved seller listing to appear in AI retrieval"
  );

  await updateListingStatus(phase13Listing!.listing.id, "REJECTED", "u-admin-1", "Rejected after verification");

  const rejectedVisibility = await searchProperties({ q: phase13Title, page: 1, pageSize: 10 });
  assert.ok(
    rejectedVisibility.items.every((item) => item.id !== phase13Listing?.property.id),
    "Expected rejected seller listing to be removed from public website search"
  );

  const mobileRejectedBody = toMobilePropertySearchResponse(rejectedVisibility, "http://127.0.0.1:3000");
  assert.ok(
    mobileRejectedBody.items.every((item: { id: string }) => item.id !== phase13Listing?.property.id),
    "Expected rejected seller listing to be removed from mobile property search"
  );

  const aiRejectedBody = await searchAiReadableProperties({ q: phase13Title, page: 1, pageSize: 10 });
  assert.ok(
    aiRejectedBody.items.every((item: { id: string }) => item.id !== phase13Listing?.property.id),
    "Expected rejected seller listing to be removed from AI retrieval"
  );

  const savedSearch = await createSavedSearch("u-buyer-1", JSON.stringify({ city: "Cairo", transaction: "BUY" }));
  assert.match(savedSearch.queryJson, /"city":"Cairo"/, "Expected saved search JSON to be stored");

  const importedSummary = await upsertImportedInventory(prisma, [
    {
      row_index: 0,
      source_file: "phase3.xlsx",
      source_sheet: "aliva",
      unit_code: "AL-TEST-01",
      category: "Garden Apartment",
      bua: 145,
      garden_area: 48,
      bedrooms: 3,
      delivery_status: "READY TO MOVE - 1",
      status: "Available",
      price: 18250000,
      price_per_sqm: 125862
    },
    {
      row_index: 1,
      source_file: "phase3.xlsx",
      source_sheet: "lvls",
      unit_code: "LV-TEST-99",
      unit_type: "Villa Roof",
      bua: 255,
      roof_area: 65,
      bedrooms: 4,
      delivery_status: "OFF PLAN - 4",
      status: "Sold",
      price: 42000000,
      price_per_sqm: 164706
    }
  ]);

  assert.equal(importedSummary.rowsPrepared, 2, "Expected imported inventory rows to be prepared");

  const importedOwner = await prisma.user.findUnique({ where: { id: IMPORTED_INVENTORY_OWNER_ID } });
  assert.equal(importedOwner?.role, "SELLER", "Expected imported inventory owner account to exist");

  const importedAliva = await prisma.property.findFirst({
    where: {
      sourceType: "IMPORTED",
      unitCode: "AL-TEST-01"
    },
    include: { listing: true }
  });
  assert.equal(importedAliva?.projectName, "Aliva", "Expected project names to be normalized for imported inventory");
  assert.equal(importedAliva?.area, "New Cairo", "Expected imported project location to be normalized");
  assert.equal(importedAliva?.listing.status, "APPROVED", "Expected available imported units to be public");

  const importedLvls = await prisma.property.findFirst({
    where: {
      sourceType: "IMPORTED",
      unitCode: "LV-TEST-99"
    },
    include: { listing: true }
  });
  assert.equal(importedLvls?.projectName, "LVLS", "Expected acronym project names to stay normalized");
  assert.equal(importedLvls?.listing.status, "REJECTED", "Expected sold imported units to stay out of public search");

  const importedSearch = await searchProperties({ q: "Aliva", page: 1, pageSize: 20 });
  assert.ok(
    importedSearch.items.some((item) => item.unitCode === "AL-TEST-01" && item.sourceType === "IMPORTED"),
    "Expected imported approved inventory to be searchable through the shared property service"
  );

  const soldSearch = await searchProperties({ q: "LV-TEST-99", page: 1, pageSize: 20 });
  assert.ok(
    soldSearch.items.every((item) => item.unitCode !== "LV-TEST-99"),
    "Expected rejected imported inventory to stay hidden from public search"
  );

  await upsertImportedInventory(prisma, [
    {
      row_index: 0,
      source_file: "phase3.xlsx",
      source_sheet: "aliva",
      unit_code: "AL-TEST-01",
      category: "Garden Apartment",
      bua: 145,
      garden_area: 48,
      bedrooms: 3,
      delivery_status: "READY TO MOVE - 1",
      status: "Available",
      price: 19000000,
      price_per_sqm: 131034
    }
  ]);

  const updatedImported = await prisma.property.findFirst({
    where: {
      sourceType: "IMPORTED",
      unitCode: "AL-TEST-01"
    }
  });
  assert.equal(updatedImported?.price, 19000000, "Expected repeated imports to update canonical property rows");

  const remainingImportedCount = await prisma.property.count({
    where: {
      sourceType: "IMPORTED"
    }
  });
  assert.equal(remainingImportedCount, 1, "Expected stale imported inventory rows to be removed on re-import");

  console.log("Phase 2 and Phase 3 service checks passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

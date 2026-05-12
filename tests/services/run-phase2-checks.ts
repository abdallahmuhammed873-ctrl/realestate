import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { loadLocalEnv } from "../../lib/server/load-env.ts";
import { IMPORTED_INVENTORY_OWNER_ID, upsertImportedInventory } from "../../prisma/import-ai-inventory.ts";
import { importRuntimeData } from "../../prisma/import-runtime-data.ts";
import {
  buyerSelectAppointmentSlot,
  createAppointment,
  createOrUpdateSellerListing,
  createSavedSearch,
  listFavorites,
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

  const searchResult = await searchProperties({ page: 1, pageSize: 10 });
  assert.ok(searchResult.total > 0, "Expected approved properties to be searchable");
  assert.ok(searchResult.items.every((item) => item.listingStatus === "APPROVED"));

  const propertyId = searchResult.items[0]?.id;
  assert.ok(propertyId, "Expected at least one searchable property");

  const savedFavorite = await toggleFavorite("u-buyer-1", propertyId);
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

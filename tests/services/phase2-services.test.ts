import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
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

beforeEach(async () => {
  await importRuntimeData(prisma);
});

test("searchProperties returns approved properties from PostgreSQL", async () => {
  const result = await searchProperties({ page: 1, pageSize: 10 });
  assert.ok(result.total > 0);
  assert.ok(result.items.length > 0);
  assert.ok(result.items.every((item) => item.listingStatus === "APPROVED"));
});

test("toggleFavorite persists through Prisma queries", async () => {
  const result = await searchProperties({ page: 1, pageSize: 1 });
  const propertyId = result.items[0]?.id;
  assert.ok(propertyId);

  const saved = await toggleFavorite("u-buyer-1", propertyId);
  assert.equal(saved.saved, true);

  const favorites = await listFavorites("u-buyer-1");
  assert.ok(favorites.some((item) => item.id === propertyId));

  const removed = await toggleFavorite("u-buyer-1", propertyId);
  assert.equal(removed.saved, false);
});

test("appointment reschedule flow works through the service layer", async () => {
  const result = await searchProperties({ page: 1, pageSize: 1 });
  const property = result.items[0];
  assert.ok(property);

  const appointment = await createAppointment({
    userId: "u-buyer-1",
    propertyId: property.id,
    datetime: new Date("2026-05-14T10:00:00.000Z").toISOString(),
    contactName: "Buyer Test",
    contactPhone: "01123456789",
    notes: "Please confirm",
    suggestedSlots: []
  });

  const rescheduled = await updateSellerAppointment(appointment.id, property.sellerId, {
    action: "RESCHEDULE",
    slots: ["2026-05-15T10:00:00.000Z", "2026-05-15T12:00:00.000Z"]
  });

  assert.equal(rescheduled?.status, "RESCHEDULED");
  assert.equal(rescheduled?.suggestedSlots.length, 2);

  const selected = await buyerSelectAppointmentSlot(appointment.id, "u-buyer-1", "2026-05-15T12:00:00.000Z");
  assert.equal(selected?.status, "PENDING");
  assert.equal(selected?.datetime, "2026-05-15T12:00:00.000Z");
});

test("seller listing submission and admin approval use the database-backed flow", async () => {
  const created = await createOrUpdateSellerListing({
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

  assert.ok(created);
  assert.equal(created?.listing.status, "PENDING");

  const approved = await updateListingStatus(created!.listing.id, "APPROVED", "u-admin-1", "Looks good");
  assert.equal(approved?.status, "APPROVED");

  const searchResult = await searchProperties({ q: "Phase 2 Service Test Listing", page: 1, pageSize: 10 });
  assert.ok(searchResult.items.some((item) => item.id === created?.property.id));
});

test("saved searches are written to PostgreSQL", async () => {
  const saved = await createSavedSearch("u-buyer-1", JSON.stringify({ city: "Cairo", transaction: "BUY" }));
  assert.equal(saved.userId, "u-buyer-1");
  assert.match(saved.queryJson, /"city":"Cairo"/);
});

test("imported AI inventory is upserted into the shared PostgreSQL property model", async () => {
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
      price: 42000000
    }
  ]);

  const importedOwner = await prisma.user.findUnique({ where: { id: IMPORTED_INVENTORY_OWNER_ID } });
  assert.equal(importedOwner?.role, "SELLER");

  const importedAliva = await prisma.property.findFirst({
    where: {
      sourceType: "IMPORTED",
      unitCode: "AL-TEST-01"
    },
    include: { listing: true }
  });

  assert.equal(importedAliva?.projectName, "Aliva");
  assert.equal(importedAliva?.area, "New Cairo");
  assert.equal(importedAliva?.listing.status, "APPROVED");

  const importedSearch = await searchProperties({ q: "Aliva", page: 1, pageSize: 20 });
  assert.ok(importedSearch.items.some((item) => item.unitCode === "AL-TEST-01"));

  const soldSearch = await searchProperties({ q: "LV-TEST-99", page: 1, pageSize: 20 });
  assert.ok(soldSearch.items.every((item) => item.unitCode !== "LV-TEST-99"));

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
  assert.equal(updatedImported?.price, 19000000);

  const remainingImportedCount = await prisma.property.count({
    where: { sourceType: "IMPORTED" }
  });
  assert.equal(remainingImportedCount, 1);
});

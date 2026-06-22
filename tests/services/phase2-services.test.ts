import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { PrismaClient } from "@prisma/client";
import { PROPERTY_IMAGE_FALLBACK, getPropertyCoverImage } from "../../lib/property-images.ts";
import { loadLocalEnv } from "../../lib/server/load-env.ts";
import { toMobilePropertySearchResponse } from "../../lib/mobile-api.ts";
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
const SAMPLE_IMAGE_PATH = "/samples/360/sample-360-panorama-cover.png";
const SAMPLE_PANORAMA_PATH = "/samples/360/sample-360-bedroom-panorama.png";

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

  let saved = await toggleFavorite("u-buyer-1", propertyId);
  if (!saved.saved) {
    saved = await toggleFavorite("u-buyer-1", propertyId);
  }
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
      images: [SAMPLE_IMAGE_PATH],
      media: [
        {
          id: "draft-photo",
          propertyId: "draft-property",
          kind: "IMAGE",
          path: SAMPLE_IMAGE_PATH,
          label: "Cover Photo",
          altText: "Front elevation",
          sortOrder: 0,
          mimeType: "image/jpeg",
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString()
        },
        {
          id: "draft-panorama",
          propertyId: "draft-property",
          kind: "PANORAMA_360",
          path: SAMPLE_PANORAMA_PATH,
          label: "Living Room Tour",
          altText: "360 living room panorama",
          sortOrder: 1,
          mimeType: "image/jpeg",
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString()
        }
      ]
    }
  });

  assert.ok(created);
  assert.equal(created?.listing.status, "PENDING");
  assert.deepEqual(created?.property.images, [SAMPLE_IMAGE_PATH]);
  assert.equal(created?.property.media?.length, 2);
  assert.equal(created?.property.media?.[1]?.kind, "PANORAMA_360");
  assert.equal(created?.property.media?.[1]?.label, "Living Room Tour");

  const approved = await updateListingStatus(created!.listing.id, "APPROVED", "u-admin-1", "Looks good");
  assert.equal(approved?.status, "APPROVED");

  const searchResult = await searchProperties({ q: "Phase 2 Service Test Listing", page: 1, pageSize: 10 });
  assert.ok(searchResult.items.some((item) => item.id === created?.property.id));
  await updateListingStatus(created!.listing.id, "REJECTED", "u-admin-1", "Service test cleanup");
});

test("keyword search matches individual words across searchable property fields", async () => {
  const created = await createOrUpdateSellerListing({
    sellerId: "u-seller-1",
    feesPaid: true,
    property: {
      title: "Azure Bay Residence",
      description: "Sea view apartment for family living",
      transaction: "BUY",
      type: "APARTMENT",
      price: 5200000,
      rentPrice: null,
      currency: "EGP",
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 175,
      lat: 30.0444,
      lng: 31.2357,
      address: "Keyword Test Address",
      city: "Cairo",
      area: "New Cairo",
      district: "South Investors",
      furnishing: "SEMI",
      paymentType: "CASH",
      completionStatus: "READY",
      amenities: ["Parking"],
      images: [SAMPLE_IMAGE_PATH]
    }
  });

  await updateListingStatus(created!.listing.id, "APPROVED", "u-admin-1", "Keyword test approval");

  const crossFieldSearch = await searchProperties({ q: "Azure apartment", page: 1, pageSize: 10 });
  assert.ok(crossFieldSearch.items.some((item) => item.id === created?.property.id));

  const districtWordSearch = await searchProperties({ q: "Investors", page: 1, pageSize: 10 });
  assert.ok(districtWordSearch.items.some((item) => item.id === created?.property.id));

  await updateListingStatus(created!.listing.id, "REJECTED", "u-admin-1", "Keyword test cleanup");
});

test("approval state gates website search, mobile api results, and AI retrieval together", async () => {
  const listingTitle = "Phase 13 Visibility Gate Listing";
  const created = await createOrUpdateSellerListing({
    sellerId: "u-seller-1",
    feesPaid: true,
    property: {
      title: listingTitle,
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
      images: [SAMPLE_IMAGE_PATH]
    }
  });

  assert.ok(created);
  assert.equal(created?.property.sourceType, "MANUAL");
  assert.equal(created?.property.inventoryStatus, null);
  assert.equal(created?.property.projectName, "Crescent Heights");
  assert.equal(created?.property.unitCode, "CH-1301");

  const pendingSearch = await searchProperties({ q: listingTitle, page: 1, pageSize: 10 });
  assert.ok(pendingSearch.items.every((item) => item.id !== created?.property.id));

  const mobilePendingBody = toMobilePropertySearchResponse(pendingSearch, "http://127.0.0.1:3000");
  assert.ok(mobilePendingBody.items.every((item: { id: string }) => item.id !== created?.property.id));

  const aiPendingBody = await searchAiReadableProperties({ q: listingTitle, page: 1, pageSize: 10 });
  assert.ok(aiPendingBody.items.every((item: { id: string }) => item.id !== created?.property.id));

  await updateListingStatus(created!.listing.id, "APPROVED", "u-admin-1", "Ready for publishing");

  const approvedSearch = await searchProperties({ q: listingTitle, page: 1, pageSize: 10 });
  assert.ok(approvedSearch.items.some((item) => item.id === created?.property.id));

  const mobileApprovedBody = toMobilePropertySearchResponse(approvedSearch, "http://127.0.0.1:3000");
  assert.ok(mobileApprovedBody.items.some((item: { id: string; projectName: string | null; unitCode: string | null }) => item.id === created?.property.id && item.projectName === "Crescent Heights" && item.unitCode === "CH-1301"));

  const aiApprovedBody = await searchAiReadableProperties({ q: listingTitle, page: 1, pageSize: 10 });
  assert.ok(aiApprovedBody.items.some((item: { id: string }) => item.id === created?.property.id));

  await updateListingStatus(created!.listing.id, "REJECTED", "u-admin-1", "Rejected after verification");

  const rejectedSearch = await searchProperties({ q: listingTitle, page: 1, pageSize: 10 });
  assert.ok(rejectedSearch.items.every((item) => item.id !== created?.property.id));

  const mobileRejectedBody = toMobilePropertySearchResponse(rejectedSearch, "http://127.0.0.1:3000");
  assert.ok(mobileRejectedBody.items.every((item: { id: string }) => item.id !== created?.property.id));

  const aiRejectedBody = await searchAiReadableProperties({ q: listingTitle, page: 1, pageSize: 10 });
  assert.ok(aiRejectedBody.items.every((item: { id: string }) => item.id !== created?.property.id));
});

test("seed-style local property images stay visible in API results", async () => {
  const created = await createOrUpdateSellerListing({
    sellerId: "u-seller-1",
    feesPaid: true,
    property: {
      title: "Missing Local Image Fallback Test",
      description: "Verifies missing local image paths do not render as broken images",
      transaction: "BUY",
      type: "APARTMENT",
      price: 3000000,
      rentPrice: null,
      currency: "EGP",
      bedrooms: 2,
      bathrooms: 1,
      areaSqm: 120,
      lat: 30.0444,
      lng: 31.2357,
      address: "Fallback Test Address",
      city: "Cairo",
      area: "New Cairo",
      district: "Lotus",
      furnishing: "SEMI",
      paymentType: "CASH",
      completionStatus: "READY",
      amenities: ["Parking"],
      images: ["/seed/properties/missing/image_1.jpg"]
    }
  });

  await updateListingStatus(created!.listing.id, "APPROVED", "u-admin-1", "Fallback test approval");

  const searchResult = await searchProperties({ q: "Missing Local Image Fallback Test", page: 1, pageSize: 10 });
  const matched = searchResult.items.find((item) => item.id === created?.property.id);

  assert.ok(matched);
  assert.deepEqual(matched?.images, ["/seed/properties/missing/image_1.jpg"]);
  assert.equal(getPropertyCoverImage(matched?.images, matched?.media), "/seed/properties/missing/image_1.jpg");

  await updateListingStatus(created!.listing.id, "REJECTED", "u-admin-1", "Fallback test cleanup");
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

import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { PrismaClient } from "@prisma/client";
import { loadLocalEnv } from "../../lib/server/load-env.ts";
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

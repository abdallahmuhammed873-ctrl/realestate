import assert from "node:assert/strict";
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

  console.log("Phase 2 service checks passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

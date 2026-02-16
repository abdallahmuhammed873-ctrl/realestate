import { PrismaClient } from "@prisma/client";
import { seedListings, seedProperties, seedUsers } from "../lib/mock-data";

const prisma = new PrismaClient();

async function main() {
  await prisma.favorite.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.property.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  for (const user of seedUsers) {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  }

  for (const listing of seedListings) {
    await prisma.listing.create({
      data: {
        id: listing.id,
        userId: listing.userId,
        status: listing.status,
        adminNotes: listing.adminNotes,
        reviewedBy: listing.reviewedBy,
        reviewedAt: listing.reviewedAt ? new Date(listing.reviewedAt) : null
      }
    });
  }

  for (const property of seedProperties) {
    await prisma.property.create({
      data: {
        id: property.id,
        listingId: property.listingId,
        title: property.title,
        description: property.description,
        transaction: property.transaction,
        type: property.type,
        price: property.price,
        rentPrice: property.rentPrice,
        currency: property.currency,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        areaSqm: property.areaSqm,
        lat: property.lat,
        lng: property.lng,
        address: property.address,
        city: property.city,
        area: property.area,
        district: property.district,
        furnishing: property.furnishing,
        paymentType: property.paymentType,
        completionStatus: property.completionStatus,
        amenities: property.amenities,
        images: property.images,
        installmentDownPayment: property.installmentDownPayment ?? null,
        installmentYears: property.installmentYears ?? null,
        installmentMonthly: property.installmentMonthly ?? null
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getUserById, createOrUpdateSellerListing } from "@/lib/repository";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  const user = await getUserById(userId);
  if (!user || user.role !== "SELLER") return NextResponse.json({ error: "Seller access required" }, { status: 403 });

  const body = await req.json();
  if (!body.property?.title || !body.property?.city) return NextResponse.json({ error: "Invalid property payload" }, { status: 400 });
  if (Array.isArray(body.property?.images) && body.property.images.some((image: unknown) => String(image ?? "").startsWith("data:"))) {
    return NextResponse.json({ error: "Property images must be uploaded through the backend before saving." }, { status: 400 });
  }
  if (Array.isArray(body.property?.media) && body.property.media.some((item: unknown) => String((item as { path?: string } | null)?.path ?? "").startsWith("data:"))) {
    return NextResponse.json({ error: "Property media must be uploaded through the backend before saving." }, { status: 400 });
  }

  const result = await createOrUpdateSellerListing({
    listingId: body.listingId ? String(body.listingId) : undefined,
    sellerId: user.id,
    feesPaid: Boolean(body.feesPaid),
    property: body.property
  });
  if (!result) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  return NextResponse.json({ ...result, message: "Submitted for admin approval." });
}

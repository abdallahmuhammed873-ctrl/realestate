import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById, createOrUpdateSellerListing } from "@/lib/repository";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  const user = getUserById(userId);
  if (!user || user.role !== "SELLER") return NextResponse.json({ error: "Seller access required" }, { status: 403 });

  const body = await req.json();
  if (!body.property?.title || !body.property?.city) return NextResponse.json({ error: "Invalid property payload" }, { status: 400 });

  const result = createOrUpdateSellerListing({
    listingId: body.listingId ? String(body.listingId) : undefined,
    sellerId: user.id,
    feesPaid: Boolean(body.feesPaid),
    property: body.property
  });
  if (!result) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  return NextResponse.json({ ...result, message: "Submitted for admin approval." });
}

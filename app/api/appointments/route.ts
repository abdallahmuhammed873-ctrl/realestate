import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAppointment, createViewingRequestMessage } from "@/lib/repository";
import { isValidPhoneNumber } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.propertyId || !body.datetime || !body.contactName || !body.contactPhone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!isValidPhoneNumber(String(body.contactPhone))) {
    return NextResponse.json({ error: "Phone number must be 11 digits and start with 01." }, { status: 400 });
  }
  const ap = await createAppointment({
    userId,
    propertyId: String(body.propertyId),
    datetime: new Date(body.datetime).toISOString(),
    contactName: String(body.contactName),
    contactPhone: String(body.contactPhone),
    notes: body.notes ? String(body.notes) : undefined,
    suggestedSlots: []
  });

  const sellerMessage = await createViewingRequestMessage({
    appointmentId: ap.id,
    buyerId: userId,
    propertyId: ap.propertyId,
    datetime: ap.datetime,
    contactName: ap.contactName,
    contactPhone: ap.contactPhone,
    notes: ap.notes
  });

  return NextResponse.json({
    ok: true,
    message: "Appointment request created and sent to seller."
  });
}

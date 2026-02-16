import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAppointment } from "@/lib/repository";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.propertyId || !body.datetime || !body.contactName || !body.contactPhone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const ap = createAppointment({
    userId,
    propertyId: String(body.propertyId),
    datetime: new Date(body.datetime).toISOString(),
    contactName: String(body.contactName),
    contactPhone: String(body.contactPhone),
    notes: body.notes ? String(body.notes) : undefined
  });
  return NextResponse.json({ appointment: ap, notification: "Appointment request created." });
}

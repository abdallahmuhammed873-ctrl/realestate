import { NextRequest, NextResponse } from "next/server";
import { getMobileAuthenticatedUser, unauthorizedMobileResponse } from "@/lib/mobile-auth";
import { getRequestOrigin, toMobileAppointment, toMobileProperty, toMobileUser } from "@/lib/mobile-api";
import {
  createAppointment,
  createViewingRequestMessage,
  listAdminAppointments,
  listBuyerAppointments,
  listSellerAppointments
} from "@/lib/repository";
import { isValidPhoneNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const user = await getMobileAuthenticatedUser(req);
  if (!user) return unauthorizedMobileResponse();

  const origin = getRequestOrigin(req);
  if (user.role === "BUYER") {
    const rows = await listBuyerAppointments(user.id);
    return NextResponse.json({
      items: rows.map((row) => ({
        appointment: toMobileAppointment(row.appointment),
        property: row.property ? toMobileProperty(row.property, { origin }) : null,
        seller: toMobileUser(row.seller, { origin })
      }))
    });
  }

  if (user.role === "SELLER") {
    const rows = await listSellerAppointments(user.id);
    return NextResponse.json({
      items: rows.map((row) => ({
        appointment: toMobileAppointment(row.appointment),
        property: toMobileProperty(row.property, { origin }),
        buyer: toMobileUser(row.buyer, { origin })
      }))
    });
  }

  const rows = await listAdminAppointments();
  return NextResponse.json({
    items: rows.map((row) => ({
      appointment: toMobileAppointment(row.appointment),
      property: row.property ? toMobileProperty(row.property, { origin }) : null,
      listing: row.listing,
      buyer: toMobileUser(row.buyer, { origin }),
      seller: toMobileUser(row.seller, { origin })
    }))
  });
}

export async function POST(req: NextRequest) {
  const user = await getMobileAuthenticatedUser(req);
  if (!user) return unauthorizedMobileResponse();
  if (user.role !== "BUYER") {
    return NextResponse.json({ error: "Only buyers can create appointments." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (!body.propertyId || !body.datetime || !body.contactName || !body.contactPhone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!isValidPhoneNumber(String(body.contactPhone))) {
    return NextResponse.json({ error: "Phone number must be 11 digits and start with 01." }, { status: 400 });
  }

  const appointment = await createAppointment({
    userId: user.id,
    propertyId: String(body.propertyId),
    datetime: new Date(body.datetime).toISOString(),
    contactName: String(body.contactName),
    contactPhone: String(body.contactPhone),
    notes: body.notes ? String(body.notes) : undefined,
    suggestedSlots: []
  });

  await createViewingRequestMessage({
    appointmentId: appointment.id,
    buyerId: user.id,
    propertyId: appointment.propertyId,
    datetime: appointment.datetime,
    contactName: appointment.contactName,
    contactPhone: appointment.contactPhone,
    notes: appointment.notes
  });

  return NextResponse.json({
    ok: true,
    appointment: toMobileAppointment(appointment),
    message: "Appointment request created and sent to seller."
  });
}

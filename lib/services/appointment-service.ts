import type { Appointment } from "../types.ts";
import {
  getSellerDashboardScopeIds,
  mapAppointment,
  mapProperty,
  mapSellerMessage,
  mapUser
} from "../server/repository-helpers.ts";
import { prisma } from "../server/prisma.ts";
import { trackAnalyticsEvent } from "./analytics-service.ts";

export async function createAppointment(input: Omit<Appointment, "id" | "status" | "createdAt" | "updatedAt">) {
  const appointment = await prisma.appointment.create({
    data: {
      userId: input.userId,
      propertyId: input.propertyId,
      datetime: new Date(input.datetime),
      status: "PENDING",
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      notes: input.notes ?? null,
      suggestedSlots: []
    }
  });
  await trackAnalyticsEvent({
    userId: input.userId,
    propertyId: input.propertyId,
    eventType: "APPOINTMENT_REQUEST",
    metadata: { appointmentId: appointment.id }
  });
  return mapAppointment(appointment);
}

export async function createViewingRequestMessage(input: {
  appointmentId: string;
  buyerId: string;
  propertyId: string;
  datetime: string;
  contactName: string;
  contactPhone: string;
  notes?: string;
}) {
  const property = await prisma.property.findUnique({
    where: { id: input.propertyId },
    include: { listing: true }
  });
  if (!property) return null;

  const lines = [
    `Buyer contact: ${input.contactName} (${input.contactPhone})`,
    `Preferred time: ${new Date(input.datetime).toLocaleString()}`,
    input.notes?.trim() ? `Notes: ${input.notes.trim()}` : null
  ].filter((line): line is string => Boolean(line));

  const message = await prisma.sellerMessage.create({
    data: {
      sellerId: property.listing.userId,
      buyerId: input.buyerId,
      propertyId: input.propertyId,
      appointmentId: input.appointmentId,
      subject: `New viewing request for ${property.title}`,
      body: lines.join("\n")
    }
  });

  return mapSellerMessage(message);
}

export async function listSellerMessages(sellerId: string) {
  const messages = await prisma.sellerMessage.findMany({
    where: { sellerId },
    include: {
      property: true,
      buyer: true
    },
    orderBy: { createdAt: "desc" }
  });

  return messages.map((message) => ({
    ...mapSellerMessage(message),
    propertyTitle: message.property?.title ?? message.propertyId,
    buyerName: message.buyer?.name ?? "Buyer",
    buyerEmail: message.buyer?.email ?? ""
  }));
}

export async function listSellerAppointments(sellerId: string) {
  const scopeIds = new Set(await getSellerDashboardScopeIds(sellerId));
  const appointments = await prisma.appointment.findMany({
    include: {
      property: {
        include: {
          media: { orderBy: { sortOrder: "asc" } },
          listing: true
        }
      },
      user: true
    },
    orderBy: { createdAt: "desc" }
  });

  return appointments
    .filter((appointment) => scopeIds.has(appointment.property.listing.userId))
    .map((appointment) => ({
      appointment: mapAppointment(appointment),
      property: mapProperty(appointment.property)!,
      buyer: mapUser(appointment.user)
    }));
}

export async function listAdminAppointments() {
  const appointments = await prisma.appointment.findMany({
    include: {
      property: {
        include: {
          media: { orderBy: { sortOrder: "asc" } },
          listing: true
        }
      },
      user: true
    },
    orderBy: { createdAt: "desc" }
  });

  return Promise.all(
    appointments.map(async (appointment) => {
      const seller = await prisma.user.findUnique({
        where: { id: appointment.property.listing.userId }
      });

      return {
        appointment: mapAppointment(appointment),
        property: mapProperty(appointment.property),
        listing: {
          id: appointment.property.listing.id,
          userId: appointment.property.listing.userId,
          status: appointment.property.listing.status,
          feesPaid: appointment.property.listing.feesPaid,
          adminNotes: appointment.property.listing.adminNotes,
          reviewedBy: appointment.property.listing.reviewedBy,
          reviewedAt: appointment.property.listing.reviewedAt?.toISOString() ?? null,
          createdAt: appointment.property.listing.createdAt.toISOString(),
          updatedAt: appointment.property.listing.updatedAt.toISOString()
        },
        buyer: mapUser(appointment.user),
        seller: mapUser(seller)
      };
    })
  );
}

export async function updateSellerAppointment(
  appointmentId: string,
  sellerId: string,
  input: { action: "APPROVE" | "DENY" | "RESCHEDULE"; datetime?: string; slots?: string[] }
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      property: {
        include: {
          listing: true
        }
      }
    }
  });
  if (!appointment || appointment.property.listing.userId !== sellerId) return null;

  if (input.action === "APPROVE") {
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CONFIRMED",
        suggestedSlots: []
      }
    });
    return mapAppointment(updated);
  }

  if (input.action === "DENY") {
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CANCELLED",
        suggestedSlots: []
      }
    });
    return mapAppointment(updated);
  }

  const normalizedSlots = (input.slots ?? [])
    .map((slot) => new Date(slot))
    .filter((slot) => !Number.isNaN(slot.getTime()));
  if (normalizedSlots.length === 0 && input.datetime) {
    const fallback = new Date(input.datetime);
    if (!Number.isNaN(fallback.getTime())) normalizedSlots.push(fallback);
  }
  if (normalizedSlots.length === 0) return null;

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: "RESCHEDULED",
      suggestedSlots: Array.from(new Set(normalizedSlots.map((slot) => slot.toISOString())))
        .slice(0, 5)
        .map((slot) => new Date(slot))
    }
  });
  return mapAppointment(updated);
}

export async function listBuyerAppointments(buyerId: string) {
  const appointments = await prisma.appointment.findMany({
    where: { userId: buyerId },
    include: {
      property: {
        include: {
          media: { orderBy: { sortOrder: "asc" } },
          listing: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return Promise.all(
    appointments.map(async (appointment) => {
      const seller = await prisma.user.findUnique({
        where: { id: appointment.property.listing.userId }
      });
      return {
        appointment: mapAppointment(appointment),
        property: mapProperty(appointment.property),
        seller: mapUser(seller)
      };
    })
  );
}

export async function buyerSelectAppointmentSlot(appointmentId: string, buyerId: string, datetime: string) {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      userId: buyerId
    }
  });
  if (!appointment) return null;

  const selected = new Date(datetime);
  if (Number.isNaN(selected.getTime())) return null;
  const allowed = new Set(appointment.suggestedSlots.map((slot) => slot.toISOString()));
  if (!allowed.has(selected.toISOString())) return null;

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      datetime: selected,
      status: "PENDING",
      suggestedSlots: []
    }
  });

  return mapAppointment(updated);
}

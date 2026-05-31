import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AppointmentSlotSelector } from "@/components/buyer/appointment-slot-selector";
import { AppointmentActions } from "@/components/seller/appointment-actions";
import { getCurrentUser } from "@/lib/auth";
import { listBuyerAppointments, listSellerAppointments } from "@/lib/repository";
import { formatPrice } from "@/lib/utils";
import { getPropertyCoverImage } from "@/lib/property-images";

function AppointmentStatus({ status }: { status: "PENDING" | "CONFIRMED" | "CANCELLED" | "RESCHEDULED" }) {
  if (status === "CONFIRMED") {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
        <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-600 text-[10px] text-white">OK</span>
        Confirmed
      </span>
    );
  }
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-red-700">
        <span className="grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[10px] text-white">X</span>
        Cancelled
      </span>
    );
  }
  if (status === "RESCHEDULED") {
    return <span className="text-xs font-semibold text-amber-700">Rescheduled</span>;
  }
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
      <span className="h-3 w-3 rounded-full bg-slate-400" />
      Waiting confirmation
    </span>
  );
}

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return <p className="rounded-2xl border bg-white p-6">Login required to view appointments.</p>;

  const resolvedSearch = await searchParams;
  const requestId = resolvedSearch.request;

  if (user.role === "BUYER") {
    const allRows = await listBuyerAppointments(user.id);
    const rows = requestId ? allRows.filter((row) => row.appointment.id === requestId) : allRows;

    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My Appointments</h1>
        {requestId && (
          <Link href="/appointments" className="inline-block text-sm font-semibold text-brand-700">
            Show all requests
          </Link>
        )}
        <Card>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-600">You have no viewing requests yet.</p>
          ) : (
            <ul className="space-y-3">
              {rows.map(({ appointment, property, seller }) => {
                const price = property ? (property.transaction === "RENT" ? property.rentPrice : property.price) : null;
                const coverImage = property ? getPropertyCoverImage(property.images) : null;
                return (
                  <li key={appointment.id} className="rounded-xl border p-3">
                    <div className="grid gap-3 md:grid-cols-[220px,1fr]">
                      {property ? (
                        <div className="relative h-40 overflow-hidden rounded-xl">
                          <Image src={coverImage!} alt={property.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 220px" quality={72} loading="lazy" />
                        </div>
                      ) : (
                        <div className="grid h-40 place-items-center rounded-xl bg-slate-100 text-xs text-slate-500">No image</div>
                      )}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <AppointmentStatus status={appointment.status} />
                          {property && <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-700">{property.transaction}</span>}
                          {property && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{property.paymentType}</span>}
                        </div>
                        <p className="text-base font-semibold">{property?.title ?? appointment.propertyId}</p>
                        {property?.description && <p className="line-clamp-2 text-sm text-slate-600">{property.description}</p>}
                        {property && <p className="text-sm font-semibold text-brand-700">{formatPrice(price, property.currency)}</p>}
                        {property && (
                          <>
                            <p className="text-xs text-slate-600">
                              {property.city} | {property.area} | {property.district}
                            </p>
                            <p className="text-xs text-slate-600">
                              {property.areaSqm} sqm | {property.bedrooms} beds | {property.bathrooms} baths
                            </p>
                          </>
                        )}
                        <p className="text-xs text-slate-600">Seller: {seller?.name ?? "Seller"}</p>
                        <p className="text-xs text-slate-600">Viewing time: {new Date(appointment.datetime).toLocaleString()}</p>
                        {appointment.notes && <p className="text-xs text-slate-700">Your notes: {appointment.notes}</p>}
                        {property && (
                          <Link href={`/p/${property.id}`} className="inline-block text-sm font-semibold text-brand-700">
                            View property details
                          </Link>
                        )}
                        {appointment.status === "RESCHEDULED" && appointment.suggestedSlots.length > 0 && (
                          <AppointmentSlotSelector appointmentId={appointment.id} slots={appointment.suggestedSlots} />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  if (user.role === "SELLER") {
    const allAppointments = await listSellerAppointments(user.id);
    const appointments = requestId ? allAppointments.filter((row) => row.appointment.id === requestId) : allAppointments;

    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Viewing Requests</h1>
        {requestId && (
          <Link href="/appointments" className="inline-block text-sm font-semibold text-brand-700">
            Show all requests
          </Link>
        )}
        <Card>
          {appointments.length === 0 ? (
            <p className="text-sm text-slate-600">No viewing requests yet.</p>
          ) : (
            <ul className="space-y-3">
              {appointments.map(({ appointment, property, buyer }) => {
                const price = property.transaction === "RENT" ? property.rentPrice : property.price;
                const coverImage = getPropertyCoverImage(property.images);
                return (
                  <li key={appointment.id} className="rounded-xl border p-3">
                    <div className="grid gap-3 md:grid-cols-[220px,1fr]">
                      <div className="relative h-40 overflow-hidden rounded-xl">
                        <Image src={coverImage} alt={property.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 220px" quality={72} loading="lazy" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <AppointmentStatus status={appointment.status} />
                          <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-700">{property.transaction}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{property.paymentType}</span>
                        </div>
                        <p className="text-base font-semibold">{property.title}</p>
                        <p className="line-clamp-2 text-sm text-slate-600">{property.description}</p>
                        <p className="text-sm font-semibold text-brand-700">{formatPrice(price, property.currency)}</p>
                        <p className="text-xs text-slate-600">
                          {property.city} | {property.area} | {property.district}
                        </p>
                        <p className="text-xs text-slate-600">
                          {property.areaSqm} sqm | {property.bedrooms} beds | {property.bathrooms} baths
                        </p>
                        <p className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span>Buyer: {buyer?.name ?? "Buyer"}</span>
                          <span>|</span>
                          <span>Phone: {appointment.contactPhone}</span>
                        </p>
                        <p className="text-xs text-slate-600">Requested time: {new Date(appointment.datetime).toLocaleString()}</p>
                        {appointment.notes && <p className="text-xs text-slate-700">Notes: {appointment.notes}</p>}
                        {appointment.suggestedSlots.length > 0 && (
                          <div className="text-xs text-slate-600">
                            <p className="mb-1 font-semibold text-brand-700">Suggested slots sent:</p>
                            <ul className="space-y-1">
                              {appointment.suggestedSlots.map((slot) => (
                                <li key={slot}>{new Date(slot).toLocaleString()}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <AppointmentActions appointmentId={appointment.id} currentDatetime={appointment.datetime} status={appointment.status} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  return <p className="rounded-2xl border bg-white p-6">Appointments are available for buyers and sellers only.</p>;
}

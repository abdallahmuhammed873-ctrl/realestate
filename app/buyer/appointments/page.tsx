import { redirect } from "next/navigation";

export default async function LegacyBuyerAppointmentsPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const resolved = await searchParams;
  if (resolved.request) redirect(`/appointments?request=${encodeURIComponent(resolved.request)}`);
  redirect("/appointments");
}

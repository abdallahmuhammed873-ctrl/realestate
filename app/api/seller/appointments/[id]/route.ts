import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById, updateSellerAppointment } from "@/lib/repository";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  const user = getUserById(userId);
  if (!user || user.role !== "SELLER") {
    return NextResponse.json({ error: "Seller access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const action = String(body.action ?? "").toUpperCase();
  if (!["APPROVE", "DENY", "RESCHEDULE"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (action === "RESCHEDULE" && !body.datetime) {
    const slots = Array.isArray(body.slots) ? body.slots : [];
    if (slots.length === 0) {
      return NextResponse.json({ error: "Provide at least one datetime slot for reschedule" }, { status: 400 });
    }
  }

  const appointment = updateSellerAppointment(id, user.id, {
    action: action as "APPROVE" | "DENY" | "RESCHEDULE",
    datetime: body.datetime ? String(body.datetime) : undefined,
    slots: Array.isArray(body.slots) ? body.slots.map((slot: unknown) => String(slot)) : undefined
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const message =
    action === "APPROVE" ? "Viewing request approved." : action === "DENY" ? "Viewing request denied." : "Viewing slots suggested.";
  return NextResponse.json({ appointment, message });
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { buyerSelectAppointmentSlot, getUserById } from "@/lib/repository";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  const user = await getUserById(userId);
  if (!user || user.role !== "BUYER") {
    return NextResponse.json({ error: "Buyer access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  if (!body.datetime) {
    return NextResponse.json({ error: "datetime is required" }, { status: 400 });
  }

  const appointment = await buyerSelectAppointmentSlot(id, user.id, String(body.datetime));
  if (!appointment) {
    return NextResponse.json({ error: "Invalid appointment or slot" }, { status: 400 });
  }

  return NextResponse.json({ appointment, message: "Viewing slot selected successfully." });
}

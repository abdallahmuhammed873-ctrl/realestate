import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getUnreadAppointmentsCount } from "@/lib/repository";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ unread: 0 });
  return NextResponse.json({ unread: await getUnreadAppointmentsCount(userId) });
}

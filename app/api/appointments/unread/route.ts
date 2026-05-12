import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUnreadAppointmentsCount } from "@/lib/repository";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  if (!userId) return NextResponse.json({ unread: 0 });
  return NextResponse.json({ unread: getUnreadAppointmentsCount(userId) });
}


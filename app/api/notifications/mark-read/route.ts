import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { markNotificationSeen } from "@/lib/repository";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Notification id is required" }, { status: 400 });

  markNotificationSeen(userId, id);
  return NextResponse.json({ ok: true });
}

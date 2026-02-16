import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById, updateListingStatus } from "@/lib/repository";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  const user = getUserById(userId);
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await req.json();
  const status = body.status as "APPROVED" | "REJECTED";
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const updated = updateListingStatus(resolved.id, status, user.id, body.notes ? String(body.notes) : undefined);
  if (!updated) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  return NextResponse.json(updated);
}

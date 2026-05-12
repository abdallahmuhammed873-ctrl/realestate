import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getUserById, removeBuyerProfile, setBuyerBlocked } from "@/lib/repository";
import { toAdminDirectoryUser } from "@/lib/sanitize";

async function requireAdmin() {
  const userId = await getCurrentUserId();
  const user = await getUserById(userId);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const resolved = await params;
  const body = await req.json();
  const action = String(body.action ?? "");
  const blocked = action === "BLOCK" ? true : action === "UNBLOCK" ? false : null;
  if (blocked === null) return NextResponse.json({ error: "Invalid action." }, { status: 400 });

  const updated = await setBuyerBlocked(resolved.id, blocked);
  if (!updated) return NextResponse.json({ error: "Buyer not found." }, { status: 404 });
  return NextResponse.json({ ok: true, buyer: toAdminDirectoryUser(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const resolved = await params;
  const removed = await removeBuyerProfile(resolved.id);
  if (!removed) return NextResponse.json({ error: "Buyer not found." }, { status: 404 });
  return NextResponse.json({ ok: true, buyer: toAdminDirectoryUser(removed) });
}

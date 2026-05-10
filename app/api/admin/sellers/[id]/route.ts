import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById, removeSellerProfile, setSellerBlocked } from "@/lib/repository";
import { toAdminDirectoryUser } from "@/lib/sanitize";

async function requireAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  const user = getUserById(userId);
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

  const updated = setSellerBlocked(resolved.id, blocked);
  if (!updated) return NextResponse.json({ error: "Seller not found." }, { status: 404 });
  return NextResponse.json({ ok: true, seller: toAdminDirectoryUser(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const resolved = await params;
  const removed = removeSellerProfile(resolved.id);
  if (!removed) return NextResponse.json({ error: "Seller not found." }, { status: 404 });
  return NextResponse.json({ ok: true, seller: toAdminDirectoryUser(removed) });
}

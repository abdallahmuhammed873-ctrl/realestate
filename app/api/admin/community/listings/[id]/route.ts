import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { deleteCommunityListingForAdmin, getUserById } from "@/lib/repository";

type Context = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const userId = await getCurrentUserId();
  const user = await getUserById(userId);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function DELETE(_: Request, ctx: Context) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await ctx.params;
  const result = await deleteCommunityListingForAdmin(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

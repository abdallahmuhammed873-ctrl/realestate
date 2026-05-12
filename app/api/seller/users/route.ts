import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { addCompanyUser, getUserById, listCompanyUsers } from "@/lib/repository";
import { isValidPhoneNumber } from "@/lib/utils";
import { toAdminDirectoryUser } from "@/lib/sanitize";

async function requireSeller() {
  const userId = await getCurrentUserId();
  const user = await getUserById(userId);
  if (!user || user.role !== "SELLER" || user.companyOwnerId || !user.isCompanyAccount) return null;
  return user;
}

export async function GET() {
  const seller = await requireSeller();
  if (!seller) return NextResponse.json({ error: "Seller access required" }, { status: 403 });
  const items = (await listCompanyUsers(seller.id))
    .map((user) => toAdminDirectoryUser(user))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const seller = await requireSeller();
  if (!seller) return NextResponse.json({ error: "Seller access required" }, { status: 403 });

  const body = await req.json();
  const phone = body.phone ? String(body.phone).trim() : undefined;
  if (phone && !isValidPhoneNumber(phone)) {
    return NextResponse.json({ error: "Phone number must be 11 digits and start with 01." }, { status: 400 });
  }
  const created = await addCompanyUser(seller.id, {
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    phone,
    password: String(body.password ?? "")
  });
  if (!created) return NextResponse.json({ error: "Invalid input, weak password, or duplicate email/phone." }, { status: 400 });
  return NextResponse.json({ ok: true, user: toAdminDirectoryUser(created) });
}

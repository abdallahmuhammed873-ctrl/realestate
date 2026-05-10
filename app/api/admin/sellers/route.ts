import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addSellerProfile, getUserById, listSellerProfilesForAdmin } from "@/lib/repository";
import { isValidPhoneNumber } from "@/lib/utils";
import { toAdminDirectoryUser } from "@/lib/sanitize";

async function requireAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  const user = getUserById(userId);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const items = listSellerProfilesForAdmin()
    .map(({ seller, stats }) => {
      const safeSeller = toAdminDirectoryUser(seller);
      if (!safeSeller) return null;
      return { seller: safeSeller, stats };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await req.json();
  const phone = body.phone ? String(body.phone).trim() : undefined;
  const password = String(body.password ?? "");
  if (phone && !isValidPhoneNumber(phone)) {
    return NextResponse.json({ error: "Phone number must be 11 digits and start with 01." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  const created = addSellerProfile({
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    phone,
    password
  });
  if (!created) return NextResponse.json({ error: "Invalid input, duplicate email, or weak password." }, { status: 400 });
  return NextResponse.json({ ok: true, seller: toAdminDirectoryUser(created) });
}

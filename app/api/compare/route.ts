import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCompareIds, getUserById, setCompareIds } from "@/lib/repository";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  const user = getUserById(userId);
  if (!user) return NextResponse.json({ ids: [] });
  return NextResponse.json({ ids: getCompareIds(user.id) });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  const user = getUserById(userId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.map((x: unknown) => String(x)) : [];
  return NextResponse.json({ ids: setCompareIds(user.id, ids) });
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSavedSearch } from "@/lib/repository";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  return NextResponse.json(await createSavedSearch(userId, JSON.stringify(body.query ?? {})));
}

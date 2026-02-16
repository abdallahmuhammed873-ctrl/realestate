import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/repository";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demo_user_id")?.value;
  const user = getUserById(userId);
  return NextResponse.json({ user });
}

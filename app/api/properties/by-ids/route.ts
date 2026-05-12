import { NextRequest, NextResponse } from "next/server";
import { searchProperties } from "@/lib/repository";

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").map((x) => x.trim()).filter(Boolean);
  const result = await searchProperties({ pageSize: 50, page: 1 });
  const items = result.items.filter((x) => ids.includes(x.id));
  return NextResponse.json({ items });
}

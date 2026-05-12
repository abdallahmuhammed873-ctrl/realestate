import { NextRequest, NextResponse } from "next/server";
import { searchProperties } from "@/lib/repository";
import { parseSearchParams } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const filters = parseSearchParams(Object.fromEntries(req.nextUrl.searchParams.entries()));
  return NextResponse.json(await searchProperties(filters));
}

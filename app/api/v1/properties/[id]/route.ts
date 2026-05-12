import { NextRequest, NextResponse } from "next/server";
import { getRequestOrigin, toMobilePublicProperty } from "@/lib/mobile-api";
import { getPublicPropertyById } from "@/lib/repository";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const property = await getPublicPropertyById(resolved.id);
  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  return NextResponse.json({
    property: toMobilePublicProperty(property, { origin: getRequestOrigin(req) })
  });
}

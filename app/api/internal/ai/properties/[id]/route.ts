import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedInternalAiRequest } from "@/lib/ai-contract";
import { getAiReadablePropertyById } from "@/lib/repository";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedInternalAiRequest(req)) {
    return NextResponse.json({ error: "Unauthorized internal AI request." }, { status: 401 });
  }

  const { id } = await params;
  const property = await getAiReadablePropertyById(id);

  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  return NextResponse.json(property);
}

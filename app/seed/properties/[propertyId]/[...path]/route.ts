import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getSeedPropertyImageUrl } from "@/lib/seed-property-images";
import { PROPERTY_IMAGE_FALLBACK } from "@/lib/property-images";

const SEED_ROOT = path.join(process.cwd(), "public", "seed", "properties");

export const dynamic = "force-dynamic";

function contentTypeForPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "image/jpeg";
}

function resolveSeedFile(propertyId: string, segments: string[]) {
  const absolutePath = path.resolve(SEED_ROOT, propertyId, ...segments);
  if (absolutePath !== SEED_ROOT && !absolutePath.startsWith(`${SEED_ROOT}${path.sep}`)) {
    return null;
  }
  return absolutePath;
}

export async function GET(_: NextRequest, context: { params: Promise<{ propertyId: string; path?: string[] }> }) {
  const params = await context.params;
  const propertyId = params.propertyId;
  const segments = params.path ?? [];
  if (!propertyId || segments.length === 0) {
    return NextResponse.json({ error: "Seed image not found." }, { status: 404 });
  }

  const absolutePath = resolveSeedFile(propertyId, segments);
  if (!absolutePath) {
    return NextResponse.json({ error: "Seed image not found." }, { status: 404 });
  }

  const stat = await fs.stat(absolutePath).catch(() => null);
  if (stat?.isFile()) {
    const body = await fs.readFile(absolutePath);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Length": String(body.byteLength),
        "Content-Type": contentTypeForPath(absolutePath)
      }
    });
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      type: true,
      transaction: true
    }
  });

  const fallbackUrl = property
    ? getSeedPropertyImageUrl({
        propertyId: property.id,
        propertyType: property.type,
        transaction: property.transaction,
        imageName: segments.join("/")
      })
    : PROPERTY_IMAGE_FALLBACK;

  return NextResponse.redirect(fallbackUrl, 307);
}

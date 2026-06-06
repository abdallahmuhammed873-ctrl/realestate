import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

export const dynamic = "force-dynamic";

function contentTypeForPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function resolveUploadFile(segments: string[]) {
  const absolutePath = path.resolve(UPLOADS_ROOT, ...segments);
  if (absolutePath !== UPLOADS_ROOT && !absolutePath.startsWith(`${UPLOADS_ROOT}${path.sep}`)) {
    return null;
  }
  return absolutePath;
}

export async function GET(_: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  const segments = params.path ?? [];
  if (segments.length === 0) return NextResponse.json({ error: "Upload not found." }, { status: 404 });

  const absolutePath = resolveUploadFile(segments);
  if (!absolutePath) return NextResponse.json({ error: "Upload not found." }, { status: 404 });

  const stat = await fs.stat(absolutePath).catch(() => null);
  if (!stat?.isFile()) return NextResponse.json({ error: "Upload not found." }, { status: 404 });

  const body = await fs.readFile(absolutePath);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Length": String(body.byteLength),
      "Content-Type": contentTypeForPath(absolutePath)
    }
  });
}

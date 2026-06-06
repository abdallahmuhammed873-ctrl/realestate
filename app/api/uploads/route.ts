import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  deleteUploadedFile,
  isPropertyUploadKind,
  isOwnedUploadPath,
  saveUploadedFiles,
  validateUploadFiles
} from "@/lib/server/local-media";

type UploadScope = "property" | "avatar" | "community";

function isUploadScope(value: string): value is UploadScope {
  return value === "property" || value === "avatar" || value === "community";
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const formData = await request.formData();
  const scopeValue = String(formData.get("scope") ?? "");
  if (!isUploadScope(scopeValue)) {
    return NextResponse.json({ error: "Invalid upload scope." }, { status: 400 });
  }
  const mediaKindValue = String(formData.get("mediaKind") ?? "").trim();
  if (mediaKindValue && (scopeValue !== "property" || !isPropertyUploadKind(mediaKindValue))) {
    return NextResponse.json({ error: "Invalid property media type." }, { status: 400 });
  }
  const mediaKind = mediaKindValue && isPropertyUploadKind(mediaKindValue) ? mediaKindValue : undefined;

  if ((scopeValue === "property" || scopeValue === "community") && user.role !== "SELLER") {
    return NextResponse.json({ error: "Seller access required." }, { status: 403 });
  }

  const validation = validateUploadFiles(scopeValue, formData.getAll("files"), mediaKind);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const files = await saveUploadedFiles(scopeValue, user.id, validation.files);
    return NextResponse.json({ ok: true, files });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save uploaded files." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const filePath = String(body.path ?? "").trim();
  if (!filePath) {
    return NextResponse.json({ error: "Path is required." }, { status: 400 });
  }

  const isAllowed =
    isOwnedUploadPath(filePath, "property", user.id) ||
    isOwnedUploadPath(filePath, "community", user.id) ||
    isOwnedUploadPath(filePath, "avatar", user.id);

  if (!isAllowed) {
    return NextResponse.json({ error: "You cannot delete this upload." }, { status: 403 });
  }

  await deleteUploadedFile(filePath);
  return NextResponse.json({ ok: true });
}

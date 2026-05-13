import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { PropertyMediaKind } from "../types.ts";

const PUBLIC_ROOT = path.join(process.cwd(), "public");
const UPLOADS_ROOT = path.join(PUBLIC_ROOT, "uploads");
const TEMP_ROOT = path.join(UPLOADS_ROOT, "tmp");
const TEMP_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type UploadScope = "property" | "avatar" | "community";

type UploadPolicy = {
  maxFileSizeBytes: number;
  maxFileCount: number;
  finalDir: (ownerId: string) => string[];
  tempDir?: (ownerId: string) => string[];
};

export type StoredUploadFile = {
  path: string;
  size: number;
  mimeType: string;
  originalName: string;
};

export type PropertyMediaDraft = {
  kind: PropertyMediaKind;
  path: string;
  label?: string | null;
  altText?: string | null;
  sortOrder?: number;
  mimeType?: string | null;
};

const UPLOAD_POLICIES: Record<UploadScope, UploadPolicy> = {
  property: {
    maxFileSizeBytes: 6 * 1024 * 1024,
    maxFileCount: 12,
    finalDir: (propertyId) => ["properties", propertyId],
    tempDir: (ownerId) => ["tmp", "properties", ownerId]
  },
  avatar: {
    maxFileSizeBytes: 2 * 1024 * 1024,
    maxFileCount: 1,
    finalDir: (userId) => ["avatars", userId]
  },
  community: {
    maxFileSizeBytes: 6 * 1024 * 1024,
    maxFileCount: 1,
    finalDir: (postId) => ["community", postId],
    tempDir: (ownerId) => ["tmp", "community", ownerId]
  }
};

function normalizeUploadPath(relativePath: string) {
  const trimmed = relativePath.trim().replace(/\\/g, "/");
  if (!trimmed.startsWith("/uploads/")) {
    throw new Error("Invalid upload path.");
  }
  return trimmed;
}

function resolveUploadPath(relativePath: string) {
  const normalized = normalizeUploadPath(relativePath);
  const absolute = path.resolve(PUBLIC_ROOT, `.${normalized}`);
  if (!absolute.startsWith(UPLOADS_ROOT)) {
    throw new Error("Upload path escapes uploads root.");
  }
  return absolute;
}

function sanitizeFileNamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function extensionForFile(fileName: string, mimeType: string) {
  const explicit = path.extname(fileName).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(explicit)) return explicit === ".jpeg" ? ".jpg" : explicit;
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

function inferMimeTypeFromPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function isFile(value: FormDataEntryValue): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value;
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function deleteEmptyParents(startPath: string, stopPath: string) {
  let current = path.dirname(startPath);
  while (current.startsWith(stopPath) && current !== stopPath) {
    try {
      const entries = await fs.readdir(current);
      if (entries.length > 0) return;
      await fs.rmdir(current);
      current = path.dirname(current);
    } catch {
      return;
    }
  }
}

async function writeFileToDir(file: File, absoluteDir: string, index = 0): Promise<StoredUploadFile> {
  const originalName = file.name || `upload-${index + 1}`;
  const mimeType = file.type || inferMimeTypeFromPath(originalName);
  const base = sanitizeFileNamePart(path.basename(originalName, path.extname(originalName))) || "image";
  const ext = extensionForFile(originalName, mimeType);
  const filename = `${String(index + 1).padStart(2, "0")}-${base}-${randomUUID().slice(0, 8)}${ext}`;
  const absolutePath = path.join(absoluteDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return {
    path: toUploadUrl(absolutePath),
    size: buffer.byteLength,
    mimeType,
    originalName
  };
}

async function cleanupExpiredTempEntries(directory: string, cutoffTime: number) {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await cleanupExpiredTempEntries(absolutePath, cutoffTime);
      const remaining = await fs.readdir(absolutePath).catch(() => []);
      if (remaining.length === 0) {
        await fs.rmdir(absolutePath).catch(() => undefined);
      }
      continue;
    }

    const stat = await fs.stat(absolutePath).catch(() => null);
    if (!stat) continue;
    if (stat.mtimeMs < cutoffTime) {
      await fs.unlink(absolutePath).catch(() => undefined);
      await deleteEmptyParents(absolutePath, TEMP_ROOT);
    }
  }
}

function toUploadUrl(absolutePath: string) {
  const relative = path.relative(PUBLIC_ROOT, absolutePath).replace(/\\/g, "/");
  return `/${relative}`;
}

export function isLocalUploadPath(filePath: string | null | undefined) {
  return Boolean(filePath && filePath.trim().startsWith("/uploads/"));
}

export function isTempUploadPath(filePath: string | null | undefined) {
  return Boolean(filePath && filePath.trim().startsWith("/uploads/tmp/"));
}

export function isOwnedUploadPath(filePath: string, scope: UploadScope, ownerId: string) {
  const normalized = normalizeUploadPath(filePath);
  if (scope === "avatar") {
    return normalized.startsWith(`/uploads/avatars/${ownerId}/`);
  }
  return normalized.startsWith(`/uploads/tmp/${scope === "property" ? "properties" : "community"}/${ownerId}/`);
}

export async function cleanupExpiredTempUploads() {
  await cleanupExpiredTempEntries(TEMP_ROOT, Date.now() - TEMP_MAX_AGE_MS).catch(() => undefined);
}

export function getUploadPolicy(scope: UploadScope) {
  return UPLOAD_POLICIES[scope];
}

export function validateUploadFiles(scope: UploadScope, entries: FormDataEntryValue[]) {
  const files = entries.filter(isFile);
  const policy = getUploadPolicy(scope);

  if (files.length === 0) {
    return { ok: false as const, error: "Please choose at least one image." };
  }
  if (files.length > policy.maxFileCount) {
    return { ok: false as const, error: `You can upload up to ${policy.maxFileCount} image${policy.maxFileCount === 1 ? "" : "s"} at a time.` };
  }

  for (const file of files) {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      return { ok: false as const, error: "Only JPG, PNG, and WebP images are allowed." };
    }
    if (file.size > policy.maxFileSizeBytes) {
      return {
        ok: false as const,
        error: `Each image must be ${Math.floor(policy.maxFileSizeBytes / (1024 * 1024))}MB or smaller.`
      };
    }
  }

  return { ok: true as const, files };
}

export async function saveUploadedFiles(scope: UploadScope, ownerId: string, files: File[]) {
  await cleanupExpiredTempUploads();
  const policy = getUploadPolicy(scope);
  const targetSegments = policy.tempDir ? policy.tempDir(ownerId) : policy.finalDir(ownerId);
  const absoluteDir = path.join(UPLOADS_ROOT, ...targetSegments);
  await ensureDir(absoluteDir);

  const stored: StoredUploadFile[] = [];
  for (const [index, file] of files.entries()) {
    stored.push(await writeFileToDir(file, absoluteDir, index));
  }
  return stored;
}

export async function deleteUploadedFile(relativePath: string) {
  const absolutePath = resolveUploadPath(relativePath);
  await fs.unlink(absolutePath).catch(() => undefined);
  await deleteEmptyParents(absolutePath, UPLOADS_ROOT);
}

async function moveFileToDir(relativePath: string, absoluteDir: string, index = 0) {
  const absoluteSource = resolveUploadPath(relativePath);
  await ensureDir(absoluteDir);
  const ext = path.extname(absoluteSource).toLowerCase() || ".jpg";
  const base = sanitizeFileNamePart(path.basename(absoluteSource, ext)) || "image";
  const filename = `${String(index + 1).padStart(2, "0")}-${base}-${randomUUID().slice(0, 8)}${ext}`;
  const absoluteTarget = path.join(absoluteDir, filename);
  await fs.rename(absoluteSource, absoluteTarget);
  await deleteEmptyParents(absoluteSource, UPLOADS_ROOT);
  return toUploadUrl(absoluteTarget);
}

export async function promotePropertyMedia(propertyId: string, nextMedia: PropertyMediaDraft[], previousPaths: string[]) {
  const finalDir = path.join(UPLOADS_ROOT, ...UPLOAD_POLICIES.property.finalDir(propertyId));
  const normalizedMedia: PropertyMediaDraft[] = [];

  for (const [index, mediaItem] of nextMedia.entries()) {
    const rawPath = mediaItem.path.trim();
    if (!rawPath) continue;

    if (!isLocalUploadPath(rawPath)) {
      normalizedMedia.push({
        kind: mediaItem.kind,
        path: rawPath,
        label: mediaItem.label?.trim() || null,
        altText: mediaItem.altText?.trim() || null,
        sortOrder: index,
        mimeType: mediaItem.mimeType ?? null
      });
      continue;
    }

    const normalized = normalizeUploadPath(rawPath);
    if (normalized.startsWith(`/uploads/properties/${propertyId}/`)) {
      normalizedMedia.push({
        kind: mediaItem.kind,
        path: normalized,
        label: mediaItem.label?.trim() || null,
        altText: mediaItem.altText?.trim() || null,
        sortOrder: index,
        mimeType: mediaItem.mimeType ?? inferMimeTypeFromPath(normalized)
      });
      continue;
    }

    const finalPath = await moveFileToDir(normalized, finalDir, index);
    normalizedMedia.push({
      kind: mediaItem.kind,
      path: finalPath,
      label: mediaItem.label?.trim() || null,
      altText: mediaItem.altText?.trim() || null,
      sortOrder: index,
      mimeType: mediaItem.mimeType ?? inferMimeTypeFromPath(finalPath)
    });
  }

  const finalPaths = normalizedMedia.map((item) => item.path);
  const removedPaths = previousPaths.filter(
    (existingPath) => isLocalUploadPath(existingPath) && !finalPaths.includes(existingPath)
  );
  for (const removedPath of removedPaths) {
    await deleteUploadedFile(removedPath);
  }

  return {
    images: normalizedMedia.filter((item) => item.kind === "IMAGE").map((item) => item.path),
    media: normalizedMedia
  };
}

export async function promoteCommunityImage(postId: string, imagePath: string) {
  if (!isLocalUploadPath(imagePath)) return imagePath;
  const normalized = normalizeUploadPath(imagePath);
  if (normalized.startsWith(`/uploads/community/${postId}/`)) return normalized;

  const finalDir = path.join(UPLOADS_ROOT, ...UPLOAD_POLICIES.community.finalDir(postId));
  return moveFileToDir(normalized, finalDir, 0);
}

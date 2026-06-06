export type UploadedFileResult = {
  path: string;
  size: number;
  mimeType: string;
  originalName: string;
};

type UploadScope = "property" | "avatar" | "community";
type PropertyUploadKind = "IMAGE" | "PANORAMA_360" | "SPIN_360_FRAME";

type UploadFilesOptions = {
  mediaKind?: PropertyUploadKind;
};

const SPIN_FRAME_BATCH_SIZE = 12;

function getUploadBatches(scope: UploadScope, files: File[], options?: UploadFilesOptions) {
  if (scope !== "property" || options?.mediaKind !== "SPIN_360_FRAME") return [files];

  const batches: File[][] = [];
  for (let index = 0; index < files.length; index += SPIN_FRAME_BATCH_SIZE) {
    batches.push(files.slice(index, index + SPIN_FRAME_BATCH_SIZE));
  }
  return batches;
}

export async function uploadFiles(scope: UploadScope, files: File[], options?: UploadFilesOptions) {
  const batches = getUploadBatches(scope, files, options);
  const uploaded: UploadedFileResult[] = [];

  for (const batch of batches) {
    if (batch.length === 0) continue;
    uploaded.push(...(await uploadFilesBatch(scope, batch, options)));
  }

  return uploaded;
}

async function uploadFilesBatch(scope: UploadScope, files: File[], options?: UploadFilesOptions) {
  const formData = new FormData();
  formData.set("scope", scope);
  if (options?.mediaKind) {
    formData.set("mediaKind", options.mediaKind);
  }
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(data?.error ?? "Upload failed."));
  }

  return (data?.files ?? []) as UploadedFileResult[];
}

export async function deleteUploadedPath(filePath: string) {
  const response = await fetch("/api/uploads", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: filePath })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(String(data?.error ?? "Could not delete file."));
  }

  return data;
}

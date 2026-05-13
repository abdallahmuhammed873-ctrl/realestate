export type UploadedFileResult = {
  path: string;
  size: number;
  mimeType: string;
  originalName: string;
};

export async function uploadFiles(scope: "property" | "avatar" | "community", files: File[]) {
  const formData = new FormData();
  formData.set("scope", scope);
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

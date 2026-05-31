import type { PropertyMedia } from "./types";

export const PROPERTY_IMAGE_FALLBACK = "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200";

function cleanImagePath(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getPropertyImageSources(images?: readonly string[] | null, media?: readonly PropertyMedia[] | null) {
  const photoMedia = (media ?? [])
    .filter((item) => item.kind === "IMAGE")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => cleanImagePath(item.path))
    .filter((item): item is string => Boolean(item));

  if (photoMedia.length > 0) return photoMedia;

  const imageSources = (images ?? [])
    .map((image) => cleanImagePath(image))
    .filter((item): item is string => Boolean(item));

  return imageSources.length > 0 ? imageSources : [PROPERTY_IMAGE_FALLBACK];
}

export function getPropertyCoverImage(images?: readonly string[] | null, media?: readonly PropertyMedia[] | null) {
  return getPropertyImageSources(images, media)[0] ?? PROPERTY_IMAGE_FALLBACK;
}

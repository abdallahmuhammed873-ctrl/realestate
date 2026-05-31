"use client";

import { useState } from "react";
import { useLanguage } from "@/components/layout/language-provider";
import type { PropertyMedia } from "@/lib/types";
import { PanoramaViewer, Spin360Viewer } from "@/components/property/panorama-viewer";
import { getPropertyImageSources } from "@/lib/property-images";

type PropertyGalleryProps = {
  images: string[];
  title: string;
  media?: PropertyMedia[];
};

export function PropertyGallery({ images, title, media = [] }: PropertyGalleryProps) {
  const { direction, t } = useLanguage();
  const panoramaMedia = media
    .filter((item) => item.kind === "PANORAMA_360")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const spinFrames = media
    .filter((item) => item.kind === "SPIN_360_FRAME")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const safeImages = getPropertyImageSources(images, media);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activePanoramaIndex, setActivePanoramaIndex] = useState(0);
  const [tourMode, setTourMode] = useState<"panorama" | "spin">("panorama");
  const activeImage = safeImages[activeImageIndex] ?? safeImages[0];
  const hasManyPhotos = safeImages.length > 1;
  const activePanorama = panoramaMedia[activePanoramaIndex] ?? null;
  const hasPanoramas = panoramaMedia.length > 0;
  const hasSpinFrames = spinFrames.length > 0;
  const activeTourMode = tourMode === "spin" && hasSpinFrames ? "spin" : "panorama";

  function goPrev() {
    setActiveImageIndex((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1));
  }

  function goNext() {
    setActiveImageIndex((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1));
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="relative h-80 w-full">
          <img src={activeImage} alt={title} className="h-full w-full rounded-2xl object-cover" />
          {hasManyPhotos ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                className={`absolute top-1/2 z-30 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border theme-divider bg-[var(--surface)] text-2xl font-bold text-[var(--ink)] shadow-lg ring-1 ring-[var(--border-strong)] hover:bg-[var(--surface-soft)] ${direction === "rtl" ? "right-3" : "left-3"}`}
                aria-label={t("previousPhoto")}
              >
                <span aria-hidden="true">&#x2039;</span>
              </button>
              <button
                type="button"
                onClick={goNext}
                className={`absolute top-1/2 z-30 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border theme-divider bg-[var(--surface)] text-2xl font-bold text-[var(--ink)] shadow-lg ring-1 ring-[var(--border-strong)] hover:bg-[var(--surface-soft)] ${direction === "rtl" ? "left-3" : "right-3"}`}
                aria-label={t("nextPhoto")}
              >
                <span aria-hidden="true">&#x203A;</span>
              </button>
            </>
          ) : null}
        </div>
        {safeImages.length > 1 ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {safeImages.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                onClick={() => setActiveImageIndex(index)}
                className={`relative h-16 overflow-hidden rounded-lg border ${
                  index === activeImageIndex ? "border-brand-700 ring-1 ring-brand-700" : "theme-divider"
                }`}
                aria-label={t("showImage", { index: index + 1 })}
              >
                <img src={src} alt={t("imageAlt", { title, index: index + 1 })} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {hasPanoramas || hasSpinFrames ? (
        <div className="surface-subtle space-y-3 rounded-2xl p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">{t("panoramaTitle")}</p>
              <p className="text-soft text-xs">{t("panoramaDescription")}</p>
            </div>
            <div className="flex items-center gap-2">
              {hasPanoramas && hasSpinFrames ? (
                <div className="flex rounded-full border theme-divider bg-[var(--surface)] p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 ${activeTourMode === "panorama" ? "bg-[var(--brand)] text-[var(--brand-contrast)]" : "text-[var(--muted)]"}`}
                    onClick={() => setTourMode("panorama")}
                  >
                    Panorama
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 ${activeTourMode === "spin" ? "bg-[var(--brand)] text-[var(--brand-contrast)]" : "text-[var(--muted)]"}`}
                    onClick={() => setTourMode("spin")}
                  >
                    Spin
                  </button>
                </div>
              ) : null}
              <span className="status-brand rounded-full px-3 py-1 text-xs font-semibold">
                {activeTourMode === "spin" ? spinFrames.length : `${activePanoramaIndex + 1} / ${panoramaMedia.length}`}
              </span>
            </div>
          </div>
          {activeTourMode === "spin" ? (
            <Spin360Viewer
              frames={spinFrames.map((item, index) => ({
                src: item.path,
                alt: item.altText || item.label || t("panoramaAltIndexed", { title, index: index + 1 }),
                label: item.label
              }))}
            />
          ) : activePanorama ? (
            <PanoramaViewer src={activePanorama.path} alt={activePanorama.altText || activePanorama.label || t("panoramaAlt", { title })} />
          ) : null}
          {activeTourMode === "panorama" && panoramaMedia.length > 1 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {panoramaMedia.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePanoramaIndex(index)}
                  className={`overflow-hidden rounded-xl border ${direction === "rtl" ? "text-right" : "text-left"} ${
                    index === activePanoramaIndex ? "border-brand-700 ring-1 ring-brand-700" : "theme-divider"
                  }`}
                >
                  <img
                    src={item.path}
                    alt={item.altText || item.label || t("panoramaAltIndexed", { title, index: index + 1 })}
                    className="h-20 w-full object-cover"
                  />
                  <div className="px-3 py-2 text-xs text-[var(--muted)]">{item.label || t("panoramaViewLabel", { index: index + 1 })}</div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

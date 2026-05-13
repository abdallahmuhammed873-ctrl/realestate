"use client";

import { useState } from "react";
import type { PropertyMedia } from "@/lib/types";
import { PanoramaViewer } from "@/components/property/panorama-viewer";

type PropertyGalleryProps = {
  images: string[];
  title: string;
  media?: PropertyMedia[];
};

export function PropertyGallery({ images, title, media = [] }: PropertyGalleryProps) {
  const photoMedia = media
    .filter((item) => item.kind === "IMAGE")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const panoramaMedia = media
    .filter((item) => item.kind === "PANORAMA_360")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const safeImages =
    photoMedia.length > 0
      ? photoMedia.map((item) => item.path)
      : images.length > 0
        ? images
        : ["https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200"];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activePanoramaIndex, setActivePanoramaIndex] = useState(0);
  const activeImage = safeImages[activeImageIndex] ?? safeImages[0];
  const hasManyPhotos = safeImages.length > 1;
  const activePanorama = panoramaMedia[activePanoramaIndex] ?? null;

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
                className="absolute left-3 top-1/2 z-30 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl font-bold text-slate-900 shadow-lg ring-1 ring-slate-300 hover:bg-slate-50"
                aria-label="Previous photo"
              >
                <span aria-hidden="true">&#x2039;</span>
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-3 top-1/2 z-30 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl font-bold text-slate-900 shadow-lg ring-1 ring-slate-300 hover:bg-slate-50"
                aria-label="Next photo"
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
                  index === activeImageIndex ? "border-brand-700 ring-1 ring-brand-700" : "border-slate-300"
                }`}
                aria-label={`Show image ${index + 1}`}
              >
                <img src={src} alt={`${title} image ${index + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {activePanorama ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">360 Tour</p>
              <p className="text-xs text-slate-500">Interactive panorama view for this property.</p>
            </div>
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              {activePanoramaIndex + 1} / {panoramaMedia.length}
            </span>
          </div>
          <PanoramaViewer src={activePanorama.path} alt={activePanorama.altText || activePanorama.label || `${title} 360 panorama`} />
          {panoramaMedia.length > 1 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {panoramaMedia.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePanoramaIndex(index)}
                  className={`overflow-hidden rounded-xl border text-left ${
                    index === activePanoramaIndex ? "border-brand-700 ring-1 ring-brand-700" : "border-slate-300"
                  }`}
                >
                  <img src={item.path} alt={item.altText || item.label || `${title} 360 panorama ${index + 1}`} className="h-20 w-full object-cover" />
                  <div className="px-3 py-2 text-xs text-slate-700">{item.label || `360 View ${index + 1}`}</div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

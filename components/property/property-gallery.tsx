"use client";

import { useState } from "react";

export function PropertyGallery({ images, title }: { images: string[]; title: string }) {
  const safeImages = images.length > 0 ? images : ["https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200"];
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = safeImages[activeIndex] ?? safeImages[0];
  const hasMany = safeImages.length > 1;

  function goPrev() {
    setActiveIndex((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1));
  }

  function goNext() {
    setActiveIndex((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1));
  }

  return (
    <div className="space-y-2">
      <div className="relative h-80 w-full">
        <img src={activeImage} alt={title} className="h-full w-full rounded-2xl object-cover" />
        {hasMany ? (
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
          {safeImages.map((src, idx) => (
            <button
              key={`${src}-${idx}`}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`relative h-16 overflow-hidden rounded-lg border ${
                idx === activeIndex ? "border-brand-700 ring-1 ring-brand-700" : "border-slate-300"
              }`}
              aria-label={`Show image ${idx + 1}`}
            >
              <img src={src} alt={`${title} image ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

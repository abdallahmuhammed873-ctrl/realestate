"use client";

import { useState } from "react";

type PanoramaViewerProps = {
  src: string;
  alt: string;
};

export function PanoramaViewer({ src, alt }: PanoramaViewerProps) {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);

  function clamp(value: number) {
    return Math.max(0, Math.min(100, value));
  }

  function updateFromClientX(clientX: number, element: HTMLDivElement) {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(clamp(next));
  }

  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={alt}
        className="relative h-72 overflow-hidden rounded-2xl border theme-divider bg-slate-950"
        style={{
          backgroundImage: `url(${src})`,
          backgroundRepeat: "repeat-x",
          backgroundSize: "auto 100%",
          backgroundPositionX: `${position}%`,
          backgroundPositionY: "center",
          cursor: dragging ? "grabbing" : "grab"
        }}
        onPointerDown={(event) => {
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromClientX(event.clientX, event.currentTarget);
        }}
        onPointerMove={(event) => {
          if (!dragging) return;
          updateFromClientX(event.clientX, event.currentTarget);
        }}
        onPointerUp={(event) => {
          setDragging(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => setDragging(false)}
      >
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-4 py-3 text-xs text-white">
          <span>360 panorama</span>
          <span>Drag to look around</span>
        </div>
      </div>
      <div className="space-y-1">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={position}
          onChange={(event) => setPosition(clamp(Number(event.target.value)))}
          aria-label="Panorama horizontal position"
          className="w-full accent-brand-700"
        />
        <p className="text-soft text-xs">Use drag or the slider to inspect the full 360 image.</p>
      </div>
    </div>
  );
}

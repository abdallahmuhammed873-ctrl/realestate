"use client";

import { useMemo, useRef, useState } from "react";

type PanoramaViewerProps = {
  src: string;
  alt: string;
};

export function PanoramaViewer({ src, alt }: PanoramaViewerProps) {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; position: number } | null>(null);

  function clamp(value: number) {
    return Math.max(0, Math.min(100, value));
  }

  function updateFromClientX(clientX: number, element: HTMLDivElement) {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) return;
    const start = dragStartRef.current;
    const next = start ? start.position + ((clientX - start.clientX) / rect.width) * 100 : ((clientX - rect.left) / rect.width) * 100;
    setPosition(clamp(next));
  }

  function step(delta: number) {
    setPosition((current) => clamp(current + delta));
  }

  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={alt}
        tabIndex={0}
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
          dragStartRef.current = { clientX: event.clientX, position };
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromClientX(event.clientX, event.currentTarget);
        }}
        onPointerMove={(event) => {
          if (!dragging) return;
          updateFromClientX(event.clientX, event.currentTarget);
        }}
        onPointerUp={(event) => {
          setDragging(false);
          dragStartRef.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          setDragging(false);
          dragStartRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") step(-5);
          if (event.key === "ArrowRight") step(5);
        }}
      >
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-4 py-3 text-xs text-white">
          <span>360 panorama</span>
          <span>Drag to look around</span>
        </div>
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-xl text-white hover:bg-black/70"
            onClick={() => step(-8)}
            aria-label="Rotate panorama left"
          >
            <span aria-hidden="true">&#x2039;</span>
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-xl text-white hover:bg-black/70"
            onClick={() => step(8)}
            aria-label="Rotate panorama right"
          >
            <span aria-hidden="true">&#x203A;</span>
          </button>
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

type Spin360ViewerProps = {
  frames: Array<{ src: string; alt: string; label?: string | null }>;
};

export function Spin360Viewer({ frames }: Spin360ViewerProps) {
  const safeFrames = useMemo(() => frames.filter((frame) => frame.src.trim().length > 0), [frames]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; frameIndex: number } | null>(null);
  const frameCount = safeFrames.length;
  const activeFrame = safeFrames[frameIndex] ?? safeFrames[0];

  function wrap(index: number) {
    if (frameCount <= 0) return 0;
    return ((index % frameCount) + frameCount) % frameCount;
  }

  function setWrappedFrame(index: number) {
    setFrameIndex(wrap(index));
  }

  function step(delta: number) {
    setFrameIndex((current) => wrap(current + delta));
  }

  function updateFromClientX(clientX: number, element: HTMLDivElement) {
    const start = dragStartRef.current;
    if (!start || frameCount <= 1) return;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) return;
    const framesPerFullDrag = frameCount;
    const deltaFrames = Math.round(((clientX - start.clientX) / rect.width) * framesPerFullDrag);
    setWrappedFrame(start.frameIndex + deltaFrames);
  }

  if (!activeFrame) return null;

  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={activeFrame.alt}
        tabIndex={0}
        className="relative h-72 overflow-hidden rounded-2xl border theme-divider bg-slate-950"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        onPointerDown={(event) => {
          setDragging(true);
          dragStartRef.current = { clientX: event.clientX, frameIndex };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragging) updateFromClientX(event.clientX, event.currentTarget);
        }}
        onPointerUp={(event) => {
          setDragging(false);
          dragStartRef.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          setDragging(false);
          dragStartRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") step(-1);
          if (event.key === "ArrowRight") step(1);
        }}
      >
        <img src={activeFrame.src} alt={activeFrame.alt} className="h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-4 py-3 text-xs text-white">
          <span>360 spin</span>
          <span>
            {frameIndex + 1} / {frameCount}
          </span>
        </div>
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-xl text-white hover:bg-black/70"
            onClick={() => step(-1)}
            aria-label="Previous 360 frame"
          >
            <span aria-hidden="true">&#x2039;</span>
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-xl text-white hover:bg-black/70"
            onClick={() => step(1)}
            aria-label="Next 360 frame"
          >
            <span aria-hidden="true">&#x203A;</span>
          </button>
        </div>
      </div>
      <input
        type="range"
        min="0"
        max={Math.max(0, frameCount - 1)}
        step="1"
        value={frameIndex}
        onChange={(event) => setWrappedFrame(Number(event.target.value))}
        aria-label="360 frame"
        className="w-full accent-brand-700"
      />
    </div>
  );
}

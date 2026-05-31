"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from "react";
import * as THREE from "three";

type PanoramaViewerProps = {
  src: string;
  alt: string;
};

type PanoramaViewState = {
  yaw: number;
  pitch: number;
  fov: number;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeAngle(value: number) {
  return ((value % 360) + 360) % 360;
}

export function PanoramaViewer({ src, alt }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number | null>(null);
  const viewRef = useRef<PanoramaViewState>({ yaw: 0, pitch: 0, fov: 75 });
  const targetRef = useRef(new THREE.Vector3());
  const dragStartRef = useRef<{ clientX: number; clientY: number; view: PanoramaViewState } | null>(null);
  const [view, setView] = useState<PanoramaViewState>({ yaw: 0, pitch: 0, fov: 75 });
  const [dragging, setDragging] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const setPanoramaView = useCallback((next: Partial<PanoramaViewState>) => {
    setView((current) => {
      const updated = {
        yaw: normalizeAngle(next.yaw ?? current.yaw),
        pitch: clampNumber(next.pitch ?? current.pitch, -72, 72),
        fov: clampNumber(next.fov ?? current.fov, 45, 92)
      };
      viewRef.current = updated;
      return updated;
    });
  }, []);

  const applyDrag = useCallback(
    (clientX: number, clientY: number, element: HTMLDivElement) => {
      const rect = element.getBoundingClientRect();
      const start = dragStartRef.current;
      if (!start || rect.width <= 0 || rect.height <= 0) return;
      const deltaX = clientX - start.clientX;
      const deltaY = clientY - start.clientY;
      setPanoramaView({
        yaw: start.view.yaw - deltaX * 0.16,
        pitch: start.view.pitch + deltaY * 0.14
      });
    },
    [setPanoramaView]
  );

  const step = useCallback(
    (yawDelta: number, pitchDelta = 0) => {
      setPanoramaView({
        yaw: viewRef.current.yaw + yawDelta,
        pitch: viewRef.current.pitch + pitchDelta
      });
    },
    [setPanoramaView]
  );

  const resetView = useCallback(() => {
    setPanoramaView({ yaw: 0, pitch: 0, fov: 75 });
  }, [setPanoramaView]);

  useEffect(() => {
    viewRef.current = view;
    const camera = cameraRef.current;
    if (camera) {
      camera.fov = view.fov;
      camera.updateProjectionMatrix();
    }
  }, [view]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const host = container;

    let disposed = false;
    setLoadState("loading");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1200);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
    renderer.setClearColor(0x020617, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "h-full w-full";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.innerHTML = "";
    host.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(500, 96, 48);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    const loader = new THREE.TextureLoader();
    loader.load(
      src,
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        material.map = texture;
        material.needsUpdate = true;
        setLoadState("ready");
      },
      undefined,
      () => {
        if (!disposed) setLoadState("error");
      }
    );

    function resize() {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function render() {
      const current = viewRef.current;
      const phi = THREE.MathUtils.degToRad(90 - current.pitch);
      const theta = THREE.MathUtils.degToRad(current.yaw);
      const target = targetRef.current;
      target.set(500 * Math.sin(phi) * Math.cos(theta), 500 * Math.cos(phi), 500 * Math.sin(phi) * Math.sin(theta));
      camera.lookAt(target);
      renderer.render(scene, camera);
      animationRef.current = window.requestAnimationFrame(render);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
    render();
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      host.innerHTML = "";
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [src]);

  function beginDrag(clientX: number, clientY: number) {
    setDragging(true);
    dragStartRef.current = { clientX, clientY, view: viewRef.current };
  }

  function endDrag() {
    setDragging(false);
    dragStartRef.current = null;
  }

  function updateFromSlider(value: number) {
    setPanoramaView({ yaw: value });
  }

  function updateZoom(value: number) {
    setPanoramaView({ fov: value });
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    setPanoramaView({ yaw: viewRef.current.yaw + horizontal * 0.12 });
  }

  const yawRounded = Math.round(view.yaw);
  const pitchRounded = Math.round(view.pitch);

  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={alt}
        tabIndex={0}
        className="relative h-[22rem] overflow-hidden rounded-2xl border theme-divider bg-slate-950 outline-none ring-brand-700/0 transition focus:ring-2"
        style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
        onPointerDown={(event) => {
          beginDrag(event.clientX, event.clientY);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragStartRef.current) return;
          applyDrag(event.clientX, event.clientY, event.currentTarget);
        }}
        onPointerUp={(event) => {
          endDrag();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={endDrag}
        onWheel={handleWheel}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") step(-8);
          if (event.key === "ArrowRight") step(8);
          if (event.key === "ArrowUp") step(0, -5);
          if (event.key === "ArrowDown") step(0, 5);
          if (event.key === "Home") resetView();
        }}
      >
        <div ref={containerRef} className="h-full w-full" data-panorama-canvas-root />
        {loadState !== "ready" ? (
          <div className="absolute inset-0 grid place-items-center bg-slate-950 text-sm text-white">
            {loadState === "error" ? "360 view unavailable" : "Loading 360 view"}
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-4 py-3 text-xs text-white">
          <span>360 panorama</span>
          <span>
            {yawRounded} deg / {pitchRounded} deg
          </span>
        </div>
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-xl text-white hover:bg-black/70"
            onClick={() => step(-12)}
            aria-label="Rotate panorama left"
            title="Rotate left"
          >
            <span aria-hidden="true">&#x2039;</span>
          </button>
          <button
            type="button"
            className="rounded-full bg-black/55 px-3 py-2 text-xs font-semibold text-white hover:bg-black/70"
            onClick={resetView}
            aria-label="Center panorama view"
            title="Center view"
          >
            Center
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-xl text-white hover:bg-black/70"
            onClick={() => step(12)}
            aria-label="Rotate panorama right"
            title="Rotate right"
          >
            <span aria-hidden="true">&#x203A;</span>
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr,160px]">
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={view.yaw}
          onChange={(event) => updateFromSlider(Number(event.target.value))}
          aria-label="Panorama horizontal direction"
          className="w-full accent-brand-700"
        />
        <input
          type="range"
          min="45"
          max="92"
          step="1"
          value={view.fov}
          onChange={(event) => updateZoom(Number(event.target.value))}
          aria-label="Panorama zoom"
          className="w-full accent-brand-700"
        />
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

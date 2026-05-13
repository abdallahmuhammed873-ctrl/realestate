"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    L?: any;
    __leafletReady?: Promise<any>;
  }
}

function ensureLeafletLoaded() {
  if (typeof window === "undefined") return Promise.reject(new Error("Window is not available"));
  if (window.L) return Promise.resolve(window.L);
  if (window.__leafletReady) return window.__leafletReady;

  window.__leafletReady = new Promise((resolve, reject) => {
    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-leaflet='true']");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", () => reject(new Error("Failed to load Leaflet script")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.dataset.leaflet = "true";
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Failed to load Leaflet script"));
    document.body.appendChild(script);
  });

  return window.__leafletReady;
}

export function OSMMapPicker({
  lat,
  lng,
  onChange
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const mapRootRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    ensureLeafletLoaded()
      .then((L) => {
        if (cancelled || !mapRootRef.current) return;
        if (mapRef.current) return;

        const map = L.map(mapRootRef.current).setView([lat, lng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const next = marker.getLatLng();
          onChangeRef.current(next.lat, next.lng);
        });
        map.on("click", (e: any) => {
          const next = e.latlng;
          marker.setLatLng(next);
          onChangeRef.current(next.lat, next.lng);
        });

        mapRef.current = map;
        markerRef.current = marker;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [lat, lng]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], mapRef.current.getZoom(), { animate: false });
  }, [lat, lng]);

  return <div ref={mapRootRef} className="h-64 w-full overflow-hidden rounded-xl border theme-divider" />;
}

export function OSMMapView({ lat, lng }: { lat: number; lng: number }) {
  const mapRootRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    ensureLeafletLoaded()
      .then((L) => {
        if (cancelled || !mapRootRef.current) return;
        if (mapRef.current) return;

        const map = L.map(mapRootRef.current, { zoomControl: true, dragging: true, scrollWheelZoom: true }).setView([lat, lng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const marker = L.marker([lat, lng]).addTo(map);
        mapRef.current = map;
        markerRef.current = marker;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [lat, lng]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], mapRef.current.getZoom(), { animate: false });
  }, [lat, lng]);

  return <div ref={mapRootRef} className="h-56 w-full overflow-hidden rounded-xl border theme-divider" />;
}

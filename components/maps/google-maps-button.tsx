"use client";

import { Button } from "@/components/ui/button";

export function GoogleMapsButton({ lat, lng }: { lat: number; lng: number }) {
  const href = `https://www.google.com/maps?q=${lat},${lng}`;

  function openMaps() {
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <Button type="button" className="mt-2 w-full sm:w-auto" onClick={openMaps}>
      View Location in Google Maps
    </Button>
  );
}

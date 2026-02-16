"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function FavoriteToggle({ propertyId, defaultSaved }: { propertyId: string; defaultSaved?: boolean }) {
  const [saved, setSaved] = useState(Boolean(defaultSaved));

  async function toggle() {
    const res = await fetch("/api/favorites/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId })
    });
    const data = await res.json();
    if (res.ok) setSaved(Boolean(data.saved));
  }

  return (
    <Button variant={saved ? "secondary" : "outline"} onClick={toggle}>
      {saved ? "Saved" : "Save"}
    </Button>
  );
}

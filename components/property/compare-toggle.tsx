"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "compare_properties";

export function CompareToggle({ propertyId }: { propertyId: string }) {
  const [inCompare, setInCompare] = useState(false);

  useEffect(() => {
    const current = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
    setInCompare(current.includes(propertyId));
  }, [propertyId]);

  function toggle() {
    const current = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
    let next = current.includes(propertyId) ? current.filter((id) => id !== propertyId) : [...current, propertyId].slice(0, 4);
    localStorage.setItem(KEY, JSON.stringify(next));
    fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next })
    }).catch(() => null);
    setInCompare(next.includes(propertyId));
    window.dispatchEvent(new Event("compare-updated"));
  }

  return (
    <Button variant={inCompare ? "secondary" : "outline"} onClick={toggle}>
      {inCompare ? "Added to Compare" : "Compare"}
    </Button>
  );
}

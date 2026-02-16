"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReviewActions({ listingId }: { listingId: string }) {
  const [notes, setNotes] = useState("");
  const router = useRouter();

  async function update(status: "APPROVED" | "REJECTED") {
    const res = await fetch(`/api/admin/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes })
    });
    if (res.ok) router.push("/admin/pending");
  }

  return (
    <div className="space-y-2">
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Admin notes" />
      <div className="flex gap-2">
        <Button onClick={() => update("APPROVED")}>Approve</Button>
        <Button variant="danger" onClick={() => update("REJECTED")}>
          Reject
        </Button>
      </div>
    </div>
  );
}

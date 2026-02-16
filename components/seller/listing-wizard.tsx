"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const steps = ["Basics", "Location", "Pricing", "Details", "Photos", "Review"];

export function ListingWizard({ listingId, initial }: { listingId?: string; initial?: Record<string, unknown> }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, unknown>>(
    initial ?? {
      title: "",
      description: "",
      transaction: "BUY",
      type: "APARTMENT",
      city: "Cairo",
      area: "New Cairo",
      district: "Fifth Settlement",
      address: "",
      lat: 30.02,
      lng: 31.49,
      price: 0,
      rentPrice: null,
      paymentType: "CASH",
      installmentDownPayment: null,
      installmentYears: null,
      installmentMonthly: null,
      bedrooms: 2,
      bathrooms: 2,
      areaSqm: 120,
      furnishing: "SEMI",
      completionStatus: "READY",
      amenities: "A/C,Balcony,Parking",
      images: "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=1200",
      currency: "EGP"
    }
  );

  async function submit() {
    const payload = {
      listingId,
      property: {
        ...form,
        amenities: String(form.amenities ?? "").split(",").map((x) => x.trim()).filter(Boolean),
        images: String(form.images ?? "").split(",").map((x) => x.trim()).filter(Boolean),
        price: Number(form.price) || null,
        rentPrice: Number(form.rentPrice) || null,
        areaSqm: Number(form.areaSqm),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        lat: Number(form.lat),
        lng: Number(form.lng),
        installmentDownPayment: Number(form.installmentDownPayment) || null,
        installmentYears: Number(form.installmentYears) || null,
        installmentMonthly: Number(form.installmentMonthly) || null
      }
    };
    const res = await fetch("/api/seller/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) router.push("/seller/dashboard");
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="mb-3 text-sm text-slate-500">Step {step + 1} of {steps.length}: {steps[step]}</p>
      <div className="grid gap-3">
        <Input placeholder="Title" value={String(form.title ?? "")} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <Textarea placeholder="Description" value={String(form.description ?? "")} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <div className="grid grid-cols-2 gap-2">
          <Select value={String(form.transaction)} onChange={(e) => setForm((f) => ({ ...f, transaction: e.target.value }))}>
            <option value="BUY">Buy</option>
            <option value="RENT">Rent</option>
            <option value="VACATION">Vacation</option>
          </Select>
          <Select value={String(form.type)} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option value="APARTMENT">Apartment</option>
            <option value="VILLA">Villa</option>
            <option value="DUPLEX">Duplex</option>
            <option value="PENTHOUSE">Penthouse</option>
            <option value="CHALET">Chalet</option>
            <option value="LAND">Land</option>
            <option value="COMMERCIAL">Commercial</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="City" value={String(form.city ?? "")} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          <Input placeholder="Area" value={String(form.area ?? "")} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
        </div>
        <Input placeholder="District" value={String(form.district ?? "")} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} />
        <Input placeholder="Address" value={String(form.address ?? "")} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" placeholder="Lat" value={String(form.lat ?? "")} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} />
          <Input type="number" placeholder="Lng" value={String(form.lng ?? "")} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" placeholder="Price" value={String(form.price ?? "")} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          <Input type="number" placeholder="Rent Price" value={String(form.rentPrice ?? "")} onChange={(e) => setForm((f) => ({ ...f, rentPrice: e.target.value }))} />
        </div>
        <Select value={String(form.paymentType)} onChange={(e) => setForm((f) => ({ ...f, paymentType: e.target.value }))}>
          <option value="CASH">Cash</option>
          <option value="INSTALLMENTS">Installments</option>
        </Select>
        <div className="grid grid-cols-3 gap-2">
          <Input type="number" placeholder="Down Payment" value={String(form.installmentDownPayment ?? "")} onChange={(e) => setForm((f) => ({ ...f, installmentDownPayment: e.target.value }))} />
          <Input type="number" placeholder="Years" value={String(form.installmentYears ?? "")} onChange={(e) => setForm((f) => ({ ...f, installmentYears: e.target.value }))} />
          <Input type="number" placeholder="Monthly" value={String(form.installmentMonthly ?? "")} onChange={(e) => setForm((f) => ({ ...f, installmentMonthly: e.target.value }))} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Input type="number" placeholder="Beds" value={String(form.bedrooms ?? "")} onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value }))} />
          <Input type="number" placeholder="Baths" value={String(form.bathrooms ?? "")} onChange={(e) => setForm((f) => ({ ...f, bathrooms: e.target.value }))} />
          <Input type="number" placeholder="Area sqm" value={String(form.areaSqm ?? "")} onChange={(e) => setForm((f) => ({ ...f, areaSqm: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={String(form.furnishing)} onChange={(e) => setForm((f) => ({ ...f, furnishing: e.target.value }))}>
            <option value="FULLY">Fully</option>
            <option value="SEMI">Semi</option>
            <option value="UNFURNISHED">Unfurnished</option>
          </Select>
          <Select value={String(form.completionStatus)} onChange={(e) => setForm((f) => ({ ...f, completionStatus: e.target.value }))}>
            <option value="READY">Ready</option>
            <option value="OFF_PLAN">Off-plan</option>
          </Select>
        </div>
        <Input placeholder="Amenities comma separated" value={String(form.amenities ?? "")} onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))} />
        <Input placeholder="Image URLs comma separated" value={String(form.images ?? "")} onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))} />
      </div>
      <div className="mt-4 flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
        ) : (
          <Button onClick={submit}>Submit for Approval</Button>
        )}
      </div>
    </div>
  );
}

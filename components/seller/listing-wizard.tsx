"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteUploadedPath, uploadFiles } from "@/lib/client/uploads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OSMMapPicker } from "@/components/maps/osm-map";

export function ListingWizard({ listingId, initial }: { listingId?: string; initial?: Record<string, unknown> }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const initialImages = Array.isArray(initial?.images)
    ? (initial?.images as string[])
    : String(initial?.images ?? "")
        .split(/[\n,]/)
        .map((x) => x.trim())
        .filter(Boolean);
  const [images, setImages] = useState<string[]>(initialImages);
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
      currency: "EGP"
    }
  );

  async function onPickImages(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    try {
      setUploading(true);
      const uploaded = await uploadFiles("property", imageFiles);
      setImages((prev) => [...prev, ...uploaded.map((item) => item.path)]);
      setError("");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload one or more images. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removeImage(index: number) {
    const targetPath = images[index];
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (targetPath.startsWith("/uploads/tmp/")) {
      try {
        await deleteUploadedPath(targetPath);
      } catch {
        setError("Image removed locally, but the temporary upload could not be cleaned up.");
      }
    }
  }

  function buildPayload() {
    setError("");

    const transaction = String(form.transaction ?? "");
    const paymentType = String(form.paymentType ?? "");
    const requiresRentPrice = transaction === "RENT";
    const requiresInstallments = paymentType === "INSTALLMENTS";

    const requiredFields: Array<[string, unknown]> = [
      ["title", form.title],
      ["description", form.description],
      ["transaction", form.transaction],
      ["type", form.type],
      ["city", form.city],
      ["area", form.area],
      ["district", form.district],
      ["address", form.address],
      ["lat", form.lat],
      ["lng", form.lng],
      ["paymentType", form.paymentType],
      ["bedrooms", form.bedrooms],
      ["bathrooms", form.bathrooms],
      ["areaSqm", form.areaSqm],
      ["furnishing", form.furnishing],
      ["completionStatus", form.completionStatus],
      ["amenities", form.amenities]
    ];

    if (requiresRentPrice) requiredFields.push(["rentPrice", form.rentPrice]);
    else requiredFields.push(["price", form.price]);
    if (requiresInstallments) {
      requiredFields.push(["installmentDownPayment", form.installmentDownPayment]);
      requiredFields.push(["installmentYears", form.installmentYears]);
      requiredFields.push(["installmentMonthly", form.installmentMonthly]);
    }

    const hasMissing = requiredFields.some(([, value]) => String(value ?? "").trim() === "");
    if (hasMissing) {
      setError("Please fill all required fields before submitting.");
      return;
    }
    if (images.length === 0) {
      setError("Please upload at least one image.");
      return null;
    }
    if (uploading) {
      setError("Please wait for image uploads to finish.");
      return null;
    }

    return {
      listingId,
      property: {
        ...form,
        amenities: String(form.amenities ?? "").split(",").map((x) => x.trim()).filter(Boolean),
        images,
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
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;

    const res = await fetch("/api/seller/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) router.push("/seller/dashboard");
  }

  function goToPayment() {
    const payload = buildPayload();
    if (!payload) return;
    sessionStorage.setItem("seller_listing_draft", JSON.stringify(payload));
    router.push("/seller/new/payment");
  }

  return (
    <form className="rounded-2xl border bg-white p-4" onSubmit={submit}>
      <div className="grid gap-3">
        <Input placeholder="Title" value={String(form.title ?? "")} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        <Textarea placeholder="Description" value={String(form.description ?? "")} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
        <div className="grid grid-cols-2 gap-2">
          <Select value={String(form.transaction)} onChange={(e) => setForm((f) => ({ ...f, transaction: e.target.value }))} required>
            <option value="BUY">Buy</option>
            <option value="RENT">Rent</option>
            <option value="VACATION">Vacation</option>
          </Select>
          <Select value={String(form.type)} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} required>
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
          <Input placeholder="City" value={String(form.city ?? "")} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} required />
          <Input placeholder="Area" value={String(form.area ?? "")} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} required />
        </div>
        <Input placeholder="District" value={String(form.district ?? "")} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} required />
        <Input placeholder="Address" value={String(form.address ?? "")} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required />
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" placeholder="Lat" value={String(form.lat ?? "")} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} required />
          <Input type="number" placeholder="Lng" value={String(form.lng ?? "")} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} required />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">Pick Location on Map</p>
          <OSMMapPicker
            lat={Number(form.lat ?? 30.02)}
            lng={Number(form.lng ?? 31.49)}
            onChange={(nextLat, nextLng) =>
              setForm((f) => ({
                ...f,
                lat: Number(nextLat.toFixed(6)),
                lng: Number(nextLng.toFixed(6))
              }))
            }
          />
          <p className="text-xs text-slate-500">Click on map or drag marker to set exact property location.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Price"
            value={String(form.price ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            required={String(form.transaction) !== "RENT"}
          />
          <Input
            type="number"
            placeholder="Rent Price"
            value={String(form.rentPrice ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, rentPrice: e.target.value }))}
            required={String(form.transaction) === "RENT"}
          />
        </div>
        <Select value={String(form.paymentType)} onChange={(e) => setForm((f) => ({ ...f, paymentType: e.target.value }))} required>
          <option value="CASH">Cash</option>
          <option value="INSTALLMENTS">Installments</option>
        </Select>
        <div className="grid grid-cols-3 gap-2">
          <Input
            type="number"
            placeholder="Down Payment"
            value={String(form.installmentDownPayment ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, installmentDownPayment: e.target.value }))}
            required={String(form.paymentType) === "INSTALLMENTS"}
          />
          <Input
            type="number"
            placeholder="Years"
            value={String(form.installmentYears ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, installmentYears: e.target.value }))}
            required={String(form.paymentType) === "INSTALLMENTS"}
          />
          <Input
            type="number"
            placeholder="Monthly"
            value={String(form.installmentMonthly ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, installmentMonthly: e.target.value }))}
            required={String(form.paymentType) === "INSTALLMENTS"}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Input type="number" placeholder="Beds" value={String(form.bedrooms ?? "")} onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value }))} required />
          <Input type="number" placeholder="Baths" value={String(form.bathrooms ?? "")} onChange={(e) => setForm((f) => ({ ...f, bathrooms: e.target.value }))} required />
          <Input type="number" placeholder="Area sqm" value={String(form.areaSqm ?? "")} onChange={(e) => setForm((f) => ({ ...f, areaSqm: e.target.value }))} required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={String(form.furnishing)} onChange={(e) => setForm((f) => ({ ...f, furnishing: e.target.value }))} required>
            <option value="FULLY">Fully</option>
            <option value="SEMI">Semi</option>
            <option value="UNFURNISHED">Unfurnished</option>
          </Select>
          <Select value={String(form.completionStatus)} onChange={(e) => setForm((f) => ({ ...f, completionStatus: e.target.value }))} required>
            <option value="READY">Ready</option>
            <option value="OFF_PLAN">Off-plan</option>
          </Select>
        </div>
        <Input placeholder="Amenities comma separated" value={String(form.amenities ?? "")} onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))} required />
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">Property Photos</label>
          <Input type="file" accept="image/*" multiple onChange={onPickImages} />
          <p className="text-xs text-slate-500">Upload up to 12 JPG, PNG, or WebP images. Each image must be 6MB or smaller.</p>
          {images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((src, idx) => (
                <div key={`${idx}-${src.slice(0, 24)}`} className="space-y-1">
                  <img src={src} alt={`Uploaded ${idx + 1}`} className="h-20 w-full rounded-lg border object-cover" />
                  <Button type="button" variant="outline" className="w-full text-xs" onClick={() => removeImage(idx)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Upload one or more photos from your device.</p>
          )}
          {uploading ? <p className="text-xs text-brand-700">Uploading images...</p> : null}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {listingId ? (
          <Button type="submit" disabled={uploading}>Submit for Approval</Button>
        ) : (
          <Button type="button" onClick={goToPayment} disabled={uploading}>
            Proceed to Pay
          </Button>
        )}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </form>
  );
}

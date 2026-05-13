"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/layout/language-provider";
import { deleteUploadedPath, uploadFiles } from "@/lib/client/uploads";
import {
  normalizeLanguage,
  translateCompletionStatus,
  translateFurnishing,
  translatePaymentType,
  translatePropertyType,
  translateTransaction
} from "@/lib/i18n";
import type { PropertyMediaKind } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OSMMapPicker } from "@/components/maps/osm-map";

type ListingMediaDraft = {
  path: string;
  kind: Extract<PropertyMediaKind, "IMAGE" | "PANORAMA_360">;
  label: string;
  altText: string;
  mimeType: string | null;
};

const MAX_PHOTOS = 12;
const MAX_PANORAMAS = 6;

function fallbackMediaLabel(kind: ListingMediaDraft["kind"], index: number) {
  return kind === "PANORAMA_360" ? `360 View ${index + 1}` : `Photo ${index + 1}`;
}

function normalizeInitialMedia(initial?: Record<string, unknown>) {
  const initialMedia = Array.isArray(initial?.media) ? initial.media : [];
  if (initialMedia.length > 0) {
    return initialMedia
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item, index) => {
        const kind = item.kind === "PANORAMA_360" ? "PANORAMA_360" : "IMAGE";
        return {
          path: String(item.path ?? "").trim(),
          kind,
          label: String(item.label ?? fallbackMediaLabel(kind, index)),
          altText: String(item.altText ?? ""),
          mimeType: typeof item.mimeType === "string" ? item.mimeType : null
        } satisfies ListingMediaDraft;
      })
      .filter((item) => item.path.length > 0);
  }

  const legacyImages = Array.isArray(initial?.images)
    ? (initial.images as string[])
    : String(initial?.images ?? "")
        .split(/[\n,]/)
        .map((x) => x.trim())
        .filter(Boolean);

  return legacyImages.map((path, index) => ({
    path,
    kind: "IMAGE" as const,
    label: fallbackMediaLabel("IMAGE", index),
    altText: "",
    mimeType: null
  }));
}

export function ListingWizard({ listingId, initial }: { listingId?: string; initial?: Record<string, unknown> }) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<ListingMediaDraft[]>(() => normalizeInitialMedia(initial));
  const [form, setForm] = useState<Record<string, unknown>>(
    initial ?? {
      title: "",
      titleEn: "",
      titleAr: "",
      description: "",
      descriptionEn: "",
      descriptionAr: "",
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

  const photos = media.filter((item) => item.kind === "IMAGE");
  const panoramas = media.filter((item) => item.kind === "PANORAMA_360");

  async function onPickMedia(kind: ListingMediaDraft["kind"], e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const nextCount = kind === "IMAGE" ? photos.length + imageFiles.length : panoramas.length + imageFiles.length;
    const limit = kind === "IMAGE" ? MAX_PHOTOS : MAX_PANORAMAS;

    if (nextCount > limit) {
      setError(
        kind === "IMAGE"
          ? t("uploadPhotoLimit")
          : t("uploadPanoramaLimit")
      );
      e.target.value = "";
      return;
    }

    try {
      setUploading(true);
      const uploaded = await uploadFiles("property", imageFiles);
      setMedia((prev) => [
        ...prev,
        ...uploaded.map((item, index) => ({
          path: item.path,
          kind,
          label: fallbackMediaLabel(kind, kind === "IMAGE" ? photos.length + index : panoramas.length + index),
          altText: "",
          mimeType: item.mimeType
        }))
      ]);
      setError("");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t("uploadFailed"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removeMedia(index: number) {
    const target = media[index];
    setMedia((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    if (target?.path.startsWith("/uploads/tmp/")) {
      try {
        await deleteUploadedPath(target.path);
      } catch {
        setError(t("tempCleanupFailed"));
      }
    }
  }

  function updateMediaField(index: number, field: "label" | "altText", value: string) {
    setMedia((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
  }

  function buildPayload() {
    setError("");

    const transaction = String(form.transaction ?? "");
    const paymentType = String(form.paymentType ?? "");
    const normalizedLanguage = normalizeLanguage(language);
    const rawTitle = String(form.title ?? "").trim();
    const rawDescription = String(form.description ?? "").trim();
    const rawTitleEn = String(form.titleEn ?? "").trim();
    const rawTitleAr = String(form.titleAr ?? "").trim();
    const rawDescriptionEn = String(form.descriptionEn ?? "").trim();
    const rawDescriptionAr = String(form.descriptionAr ?? "").trim();
    const titleEn = rawTitleEn || (normalizedLanguage === "en" ? rawTitle : "");
    const titleAr = rawTitleAr || (normalizedLanguage === "ar" ? rawTitle : "");
    const descriptionEn = rawDescriptionEn || (normalizedLanguage === "en" ? rawDescription : "");
    const descriptionAr = rawDescriptionAr || (normalizedLanguage === "ar" ? rawDescription : "");
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
      setError(t("fillRequiredFields"));
      return null;
    }
    if (photos.length === 0) {
      setError(t("uploadOnePhoto"));
      return null;
    }
    if (uploading) {
      setError(t("waitForUploads"));
      return null;
    }

    const draftMedia = media.map((item, index) => ({
      id: `draft-media-${index}`,
      propertyId: listingId ?? "draft-property",
      kind: item.kind,
      path: item.path,
      label: item.label.trim() || fallbackMediaLabel(item.kind, index),
      altText: item.altText.trim() || null,
      sortOrder: index,
      mimeType: item.mimeType ?? null,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString()
    }));

    return {
      listingId,
      property: {
        ...form,
        title: rawTitle,
        titleEn: titleEn || null,
        titleAr: titleAr || null,
        description: rawDescription,
        descriptionEn: descriptionEn || null,
        descriptionAr: descriptionAr || null,
        amenities: String(form.amenities ?? "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        images: draftMedia.filter((item) => item.kind === "IMAGE").map((item) => item.path),
        media: draftMedia,
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

  function renderMediaSection(kind: ListingMediaDraft["kind"], title: string, helperText: string, items: ListingMediaDraft[]) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-[var(--ink)]">{title}</label>
        <Input type="file" accept="image/*" multiple onChange={(e) => void onPickMedia(kind, e)} />
        <p className="text-soft text-xs">{helperText}</p>
        {items.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {media.map((item, index) => {
              if (item.kind !== kind) return null;
              return (
                <div key={`${item.kind}-${item.path}`} className="surface-subtle space-y-2 rounded-xl p-3">
                  <img
                    src={item.path}
                    alt={item.altText || item.label}
                    className={`w-full rounded-lg border object-cover ${kind === "PANORAMA_360" ? "h-28" : "h-24"}`}
                  />
                  <Input
                    placeholder={kind === "PANORAMA_360" ? t("viewerLabel") : t("photoLabel")}
                    value={item.label}
                    onChange={(e) => updateMediaField(index, "label", e.target.value)}
                  />
                  <Input
                    placeholder={kind === "PANORAMA_360" ? t("panoramaAltText") : t("photoAltText")}
                    value={item.altText}
                    onChange={(e) => updateMediaField(index, "altText", e.target.value)}
                  />
                  <Button type="button" variant="outline" className="w-full text-xs" onClick={() => void removeMedia(index)}>
                    {t("remove")}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-soft text-xs">
            {kind === "PANORAMA_360"
              ? t("optionalPanoramaHint")
              : t("uploadPhotoHint")}
          </p>
        )}
      </div>
    );
  }

  return (
    <form className="surface-card rounded-2xl p-4" onSubmit={submit}>
      <div className="grid gap-3">
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            placeholder={t("title")}
            value={String(form.title ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <Input
            placeholder={t("titleEnglishOptional")}
            value={String(form.titleEn ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))}
          />
        </div>
        <Input
          placeholder={t("titleArabicOptional")}
          value={String(form.titleAr ?? "")}
          onChange={(e) => setForm((f) => ({ ...f, titleAr: e.target.value }))}
        />
        <Textarea
          placeholder={t("description")}
          value={String(form.description ?? "")}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          required
        />
        <div className="grid gap-2 md:grid-cols-2">
          <Textarea
            placeholder={t("descriptionEnglishOptional")}
            value={String(form.descriptionEn ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
          />
          <Textarea
            placeholder={t("descriptionArabicOptional")}
            value={String(form.descriptionAr ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={String(form.transaction)} onChange={(e) => setForm((f) => ({ ...f, transaction: e.target.value }))} required>
            <option value="BUY">{translateTransaction("BUY", language)}</option>
            <option value="RENT">{translateTransaction("RENT", language)}</option>
            <option value="VACATION">{translateTransaction("VACATION", language)}</option>
          </Select>
          <Select value={String(form.type)} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} required>
            <option value="APARTMENT">{translatePropertyType("APARTMENT", language)}</option>
            <option value="VILLA">{translatePropertyType("VILLA", language)}</option>
            <option value="DUPLEX">{translatePropertyType("DUPLEX", language)}</option>
            <option value="PENTHOUSE">{translatePropertyType("PENTHOUSE", language)}</option>
            <option value="CHALET">{translatePropertyType("CHALET", language)}</option>
            <option value="LAND">{translatePropertyType("LAND", language)}</option>
            <option value="COMMERCIAL">{translatePropertyType("COMMERCIAL", language)}</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder={t("city")} value={String(form.city ?? "")} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} required />
          <Input placeholder={t("area")} value={String(form.area ?? "")} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} required />
        </div>
        <Input placeholder={t("district")} value={String(form.district ?? "")} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} required />
        <Input placeholder={t("address")} value={String(form.address ?? "")} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required />
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" placeholder={t("latitude")} value={String(form.lat ?? "")} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} required />
          <Input type="number" placeholder={t("longitude")} value={String(form.lng ?? "")} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} required />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--ink)]">{t("pickLocationOnMap")}</p>
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
          <p className="text-soft text-xs">{t("mapHelper")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder={t("price")}
            value={String(form.price ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            required={String(form.transaction) !== "RENT"}
          />
          <Input
            type="number"
            placeholder={t("rentPrice")}
            value={String(form.rentPrice ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, rentPrice: e.target.value }))}
            required={String(form.transaction) === "RENT"}
          />
        </div>
        <Select value={String(form.paymentType)} onChange={(e) => setForm((f) => ({ ...f, paymentType: e.target.value }))} required>
          <option value="CASH">{translatePaymentType("CASH", language)}</option>
          <option value="INSTALLMENTS">{translatePaymentType("INSTALLMENTS", language)}</option>
        </Select>
        <div className="grid grid-cols-3 gap-2">
          <Input
            type="number"
            placeholder={t("downPayment")}
            value={String(form.installmentDownPayment ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, installmentDownPayment: e.target.value }))}
            required={String(form.paymentType) === "INSTALLMENTS"}
          />
          <Input
            type="number"
            placeholder={t("years")}
            value={String(form.installmentYears ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, installmentYears: e.target.value }))}
            required={String(form.paymentType) === "INSTALLMENTS"}
          />
          <Input
            type="number"
            placeholder={t("monthly")}
            value={String(form.installmentMonthly ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, installmentMonthly: e.target.value }))}
            required={String(form.paymentType) === "INSTALLMENTS"}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Input type="number" placeholder={t("beds")} value={String(form.bedrooms ?? "")} onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value }))} required />
          <Input type="number" placeholder={t("baths")} value={String(form.bathrooms ?? "")} onChange={(e) => setForm((f) => ({ ...f, bathrooms: e.target.value }))} required />
          <Input type="number" placeholder={t("areaSqmLabel")} value={String(form.areaSqm ?? "")} onChange={(e) => setForm((f) => ({ ...f, areaSqm: e.target.value }))} required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={String(form.furnishing)} onChange={(e) => setForm((f) => ({ ...f, furnishing: e.target.value }))} required>
            <option value="FULLY">{translateFurnishing("FULLY", language)}</option>
            <option value="SEMI">{translateFurnishing("SEMI", language)}</option>
            <option value="UNFURNISHED">{translateFurnishing("UNFURNISHED", language)}</option>
          </Select>
          <Select value={String(form.completionStatus)} onChange={(e) => setForm((f) => ({ ...f, completionStatus: e.target.value }))} required>
            <option value="READY">{translateCompletionStatus("READY", language)}</option>
            <option value="OFF_PLAN">{translateCompletionStatus("OFF_PLAN", language)}</option>
          </Select>
        </div>
        <Input
          placeholder={t("amenitiesCommaSeparated")}
          value={String(form.amenities ?? "")}
          onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
          required
        />
        {renderMediaSection("IMAGE", t("propertyPhotos"), t("propertyPhotosHelp"), photos)}
        {renderMediaSection("PANORAMA_360", t("panoramaFiles"), t("panoramaFilesHelp"), panoramas)}
        {uploading ? <p className="text-xs text-[var(--brand)]">{t("uploadingMedia")}</p> : null}
      </div>
      <div className="mt-4 space-y-2">
        {listingId ? (
          <Button type="submit" disabled={uploading}>{t("submitForApproval")}</Button>
        ) : (
          <Button type="button" onClick={goToPayment} disabled={uploading}>
            {t("proceedToPay")}
          </Button>
        )}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </form>
  );
}

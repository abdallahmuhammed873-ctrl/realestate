"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteUploadedPath, uploadFiles } from "@/lib/client/uploads";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/layout/language-provider";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string | null;
  role: "BUYER" | "SELLER" | "ADMIN";
  isCompanyAccount?: boolean;
  companyName?: string;
};

type SellerListingItem = {
  listingId: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  title: string;
  description: string;
  imageUrl: string;
  updatedAt: string;
  createdByName: string;
  isCompanyUser: boolean;
};

export function ProfileClient({ user, sellerListings }: { user: ProfileUser; sellerListings?: SellerListingItem[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileUser>(user);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveInfo, setSaveInfo] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl ?? null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [myListings, setMyListings] = useState<SellerListingItem[]>(sellerListings ?? []);
  const [deleteListingId, setDeleteListingId] = useState<string | null>(null);

  const roleLabel =
    profile.role === "SELLER" && profile.isCompanyAccount ? t("developer") : profile.role === "SELLER" ? t("seller") : profile.role;
  const title =
    profile.role === "SELLER" && profile.isCompanyAccount
      ? t("developerProfile")
      : profile.role === "SELLER"
        ? t("sellerProfile")
        : profile.role === "ADMIN"
          ? t("adminProfile")
          : t("userProfile");

  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setAvatarLoading(true);
    setSaveError("");
    setSaveInfo("");
    try {
      const [uploaded] = await uploadFiles("avatar", [file]);
      if (!uploaded) return;
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, avatarPath: uploaded.path })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        await deleteUploadedPath(uploaded.path).catch(() => undefined);
        setSaveError(String(data?.error ?? t("failedToUpdateAvatar")));
        return;
      }
      const next = data?.user as ProfileUser | undefined;
      if (next) {
        setProfile((prev) => ({ ...prev, ...next }));
        setAvatarUrl(next.avatarUrl ?? uploaded.path);
      } else {
        setAvatarUrl(uploaded.path);
      }
      setSaveInfo(t("profilePictureUpdated"));
      router.refresh();
    } catch (uploadError) {
      setSaveError(uploadError instanceof Error ? uploadError.message : t("failedToUploadAvatar"));
    } finally {
      setAvatarLoading(false);
      e.target.value = "";
    }
  }

  async function removeImage() {
    setAvatarLoading(true);
    setSaveError("");
    setSaveInfo("");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, avatarPath: null })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveError(String(data?.error ?? t("failedToRemoveAvatar")));
        return;
      }
      const next = data?.user as ProfileUser | undefined;
      setAvatarUrl(null);
      if (next) {
        setProfile((prev) => ({ ...prev, ...next, avatarUrl: null }));
      }
      setSaveInfo(t("profilePictureRemoved"));
      router.refresh();
    } finally {
      setAvatarLoading(false);
    }
  }

  async function deleteListing(listingId: string) {
    if (!confirm(t("deleteListingConfirm"))) return;
    setDeleteListingId(listingId);
    try {
      const res = await fetch(`/api/seller/listings/${listingId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(String(data?.error ?? t("failedToDeleteListing")));
        return;
      }
      setMyListings((prev) => prev.filter((x) => x.listingId !== listingId));
    } finally {
      setDeleteListingId(null);
    }
  }

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError("");
    setSaveInfo("");
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveError(String(data?.error ?? t("failedToUpdateProfile")));
        return;
      }
      const next = data?.user as ProfileUser | undefined;
      if (next) {
        setProfile((prev) => ({ ...prev, ...next }));
        setName(next.name);
        setEmail(next.email);
        setPhone(next.phone ?? "");
      }
      setIsEditing(false);
      setSaveInfo(t("profileUpdated"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold text-[var(--ink)]">{title}</h1>
      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border theme-divider bg-[var(--surface-soft)]">
            {avatarUrl ? (
              <img src={avatarUrl} alt={t("profileImageAlt", { name: profile.name })} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-[var(--brand-strong)]">{(profile.name.trim().charAt(0) || "U").toUpperCase()}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-lg border theme-divider px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-soft)]">
              {avatarLoading ? t("uploading") : t("addProfilePicture")}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPickImage} disabled={avatarLoading} />
            </label>
            {avatarUrl ? (
              <Button type="button" variant="outline" onClick={removeImage} disabled={avatarLoading}>
                {t("removePicture")}
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setIsEditing((v) => !v)}>
              {isEditing ? t("cancelEdit") : t("editProfile")}
            </Button>
          </div>
        </div>

        {isEditing ? (
          <form className="space-y-3" onSubmit={saveProfile}>
            <div>
              <p className="text-sm font-bold uppercase text-[var(--muted)]">{t("name")}</p>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-[var(--muted)]">{t("email")}</p>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-[var(--muted)]">{t("phoneNumber")}</p>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                pattern="^$|01[0-9]{9}"
                title={t("phoneValidation")}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? t("saving") : t("saveChanges")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div>
              <p className="text-sm font-bold uppercase text-[var(--muted)]">{t("name")}</p>
              <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{profile.name}</p>
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-[var(--muted)]">{t("email")}</p>
              <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{profile.email}</p>
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-[var(--muted)]">{t("phoneNumber")}</p>
              <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{profile.phone ?? t("noPhoneAdded")}</p>
            </div>
          </>
        )}
        <div>
          <p className="text-sm font-bold uppercase text-[var(--muted)]">{t("role")}</p>
          <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{roleLabel}</p>
        </div>
        {profile.companyName ? (
          <div>
            <p className="text-sm font-bold uppercase text-[var(--muted)]">{t("company")}</p>
            <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{profile.companyName}</p>
          </div>
        ) : null}
        {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
        {saveInfo ? <p className="text-sm text-emerald-700">{saveInfo}</p> : null}
      </Card>

      {profile.role === "SELLER" ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-[var(--ink)]">{t("yourPropertyPosts")}</h2>
            <Link href="/seller/new" className="rounded-xl bg-brand-700 px-3 py-2 text-sm font-semibold text-white">
              {t("newListing")}
            </Link>
          </div>
          {myListings.length === 0 ? (
            <p className="text-sm font-medium text-[var(--muted)]">{t("noListingsYet")}</p>
          ) : (
            <ul className="space-y-3">
              {myListings.map((item) => (
                <li key={item.listingId} className="rounded-xl border theme-divider bg-[var(--surface-elevated)] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-28 w-full rounded-xl border theme-divider object-cover sm:w-40" /> : null}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="status-neutral rounded-full px-2 py-1 text-xs font-semibold">{item.status}</span>
                        <span className="text-xs font-medium text-[var(--muted)]">{t("updatedAtLabel", { value: new Date(item.updatedAt).toLocaleString() })}</span>
                      </div>
                      <p className="truncate text-lg font-semibold text-[var(--ink)]">{item.title}</p>
                      <p className="line-clamp-2 text-sm font-medium text-[var(--muted)]">{item.description}</p>
                      <p className="text-xs font-medium text-[var(--muted)]">
                        {t("createdByLabel", { name: item.createdByName })} {item.isCompanyUser ? t("companyUserSuffix") : ""}
                      </p>
                      <div className="flex flex-wrap gap-3 pt-1">
                        <Link href={`/seller/listings/${item.listingId}/edit`} className="text-sm font-semibold link-accent">
                          {t("editListing")}
                        </Link>
                        <button
                          type="button"
                          onClick={() => void deleteListing(item.listingId)}
                          disabled={deleteListingId === item.listingId}
                          className="text-sm font-semibold text-red-600 disabled:opacity-60"
                        >
                          {deleteListingId === item.listingId ? t("deleting") : t("deleteListing")}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}

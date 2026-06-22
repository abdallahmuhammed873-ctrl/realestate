"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CommunityFeed, type ListingView, type PostView } from "@/components/community/community-feed";
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
  companyOwnerId?: string;
  companyName?: string;
};

export function ProfileClient({
  user,
  communityPosts,
  communityListings
}: {
  user: ProfileUser;
  communityPosts?: PostView[];
  communityListings?: ListingView[];
}) {
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

  const roleLabel =
    profile.role === "SELLER" && profile.isCompanyAccount ? t("developer") : profile.role === "SELLER" ? t("seller") : profile.role;
  const hasCompanyPostsAccess = profile.role === "SELLER" && Boolean(profile.companyOwnerId || profile.isCompanyAccount);
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
            {hasCompanyPostsAccess ? (
              <Link
                href="/profile/company-posts"
                className="inline-flex items-center justify-center rounded-xl border theme-divider bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] shadow-sm transition hover:bg-[var(--surface-soft)]"
              >
                {t("companyPosts")}
              </Link>
            ) : null}
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
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--ink)]">{t("myPosts")}</h2>
          <CommunityFeed
            initialPosts={communityPosts ?? []}
            listings={communityListings ?? []}
            viewer={{ id: profile.id, role: profile.role, canCreatePost: true }}
            showListings
            showCreatePost={false}
            listingSectionTitle={t("propertyPosts")}
            emptyListingsMessage={null}
            emptyPostsMessage={t("noCommunityPostsYet")}
            postsRefreshUrl={`/api/community/users/${encodeURIComponent(profile.id)}/posts`}
          />
        </section>
      ) : null}

    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

const AVATAR_EVENT = "profile:avatar-changed";

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
  const [profile, setProfile] = useState<ProfileUser>(user);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveInfo, setSaveInfo] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [myListings, setMyListings] = useState<SellerListingItem[]>(sellerListings ?? []);
  const [deleteListingId, setDeleteListingId] = useState<string | null>(null);
  const storageKey = useMemo(() => `profile_avatar_${profile.id}`, [profile.id]);
  const roleLabel = profile.role === "SELLER" && profile.isCompanyAccount ? "Developer" : profile.role === "SELLER" ? "Seller" : profile.role;
  const title = roleLabel === "Seller" ? "Seller Profile" : roleLabel === "Developer" ? "Developer Profile" : roleLabel === "ADMIN" ? "Admin Profile" : "User Profile";

  useEffect(() => {
    const existing = localStorage.getItem(storageKey);
    setAvatarUrl(existing || null);
  }, [storageKey]);

  function broadcastAvatarChanged() {
    window.dispatchEvent(new CustomEvent(AVATAR_EVENT, { detail: { userId: profile.id } }));
  }

  function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next = typeof reader.result === "string" ? reader.result : null;
      if (!next) return;
      localStorage.setItem(storageKey, next);
      setAvatarUrl(next);
      broadcastAvatarChanged();
      fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, avatarUrl: next })
      }).catch(() => null);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    localStorage.removeItem(storageKey);
    setAvatarUrl(null);
    broadcastAvatarChanged();
    fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, avatarUrl: null })
    }).catch(() => null);
  }

  async function deleteListing(listingId: string) {
    if (!confirm("Delete this listing? This will remove it from the platform.")) return;
    setDeleteListingId(listingId);
    try {
      const res = await fetch(`/api/seller/listings/${listingId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(String(data?.error ?? "Failed to delete listing."));
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
        setSaveError(String(data?.error ?? "Failed to update profile."));
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
      setSaveInfo("Profile updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-slate-100">
            {avatarUrl ? (
              <img src={avatarUrl} alt={`${profile.name} profile`} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-brand-800">{(profile.name.trim().charAt(0) || "U").toUpperCase()}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              Add Profile Picture
              <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            </label>
            {avatarUrl ? (
              <Button type="button" variant="outline" onClick={removeImage}>
                Remove Picture
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setIsEditing((v) => !v)}>
              {isEditing ? "Cancel Edit" : "Edit Profile"}
            </Button>
          </div>
        </div>

        {isEditing ? (
          <form className="space-y-3" onSubmit={saveProfile}>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Name</p>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Email</p>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Phone</p>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                pattern="^$|01[0-9]{9}"
                title="Phone number must be 11 digits and start with 01"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Name</p>
              <p className="text-base font-semibold text-slate-900">{profile.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Email</p>
              <p className="text-base text-slate-800">{profile.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Phone</p>
              <p className="text-base text-slate-800">{profile.phone ?? "No phone added"}</p>
            </div>
          </>
        )}
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Role</p>
          <p className="text-base text-slate-800">{roleLabel}</p>
        </div>
        {profile.companyName ? (
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Company</p>
            <p className="text-base text-slate-800">{profile.companyName}</p>
          </div>
        ) : null}
        {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
        {saveInfo ? <p className="text-sm text-emerald-700">{saveInfo}</p> : null}
      </Card>

      {profile.role === "SELLER" ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Your Property Posts</h2>
            <Link href="/seller/new" className="rounded-xl bg-brand-700 px-3 py-2 text-sm font-semibold text-white">
              New Listing
            </Link>
          </div>
          {myListings.length === 0 ? (
            <p className="text-sm text-slate-600">No listings yet.</p>
          ) : (
            <ul className="space-y-3">
              {myListings.map((item) => (
                <li key={item.listingId} className="rounded-xl border p-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-28 w-full rounded-xl border object-cover sm:w-40"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
                        <span className="text-xs text-slate-500">Updated: {new Date(item.updatedAt).toLocaleString()}</span>
                      </div>
                      <p className="truncate text-base font-semibold text-slate-900">{item.title}</p>
                      <p className="line-clamp-2 text-sm text-slate-600">{item.description}</p>
                      <p className="text-xs text-slate-600">
                        Created by: {item.createdByName}
                        {item.isCompanyUser ? " (Company User)" : ""}
                      </p>
                      <div className="pt-1 flex flex-wrap gap-3">
                        <Link href={`/seller/listings/${item.listingId}/edit`} className="text-sm font-semibold text-brand-700">
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteListing(item.listingId)}
                          disabled={deleteListingId === item.listingId}
                          className="text-sm font-semibold text-red-600 disabled:opacity-60"
                        >
                          {deleteListingId === item.listingId ? "Deleting..." : "Delete"}
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

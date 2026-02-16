import Link from "next/link";
import { PropertyCard } from "@/components/property/property-card";
import { getCurrentUser } from "@/lib/auth";
import { listFavorites } from "@/lib/repository";

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center">
        <h1 className="text-xl font-bold">Login to view favorites</h1>
        <p className="mt-2 text-slate-600">Save listings, compare later, and get recommendations.</p>
        <Link href="/auth" className="mt-4 inline-block rounded-xl bg-brand-700 px-4 py-2 text-white">
          Go to Login
        </Link>
      </div>
    );
  }
  const items = listFavorites(user.id);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Saved Listings</h1>
      {items.length === 0 ? (
        <p className="rounded-2xl border bg-white p-8 text-center text-slate-600">No favorites yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}

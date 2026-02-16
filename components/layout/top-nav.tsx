import Link from "next/link";

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-brand-800">
          <span className="rounded-lg bg-cheque px-2 py-1 text-slate-900">CK</span>
          Cheque & Key
        </Link>
        <nav className="hidden items-center gap-4 text-sm md:flex">
          <Link href="/search">Search</Link>
          <Link href="/favorites">Favorites</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/seller/dashboard">Seller</Link>
          <Link href="/admin">Admin</Link>
          <Link href="/auth" className="rounded-xl border px-3 py-1.5">
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}

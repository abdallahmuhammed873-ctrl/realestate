import Link from "next/link";
import { TopNavLinks } from "@/components/layout/top-nav-links";
import { getCurrentUser } from "@/lib/auth";

export async function TopNav() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-brand-800">
          <span className="rounded-lg bg-cheque px-2 py-1 text-slate-900">CK</span>
          Cheque & Key
        </Link>
        <TopNavLinks user={user} />
      </div>
    </header>
  );
}

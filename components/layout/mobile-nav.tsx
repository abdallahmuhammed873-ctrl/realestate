"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/favorites", label: "Favorites" },
  { href: "/compare", label: "Compare" },
  { href: "/auth", label: "Profile" }
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white md:hidden">
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              className={cn(
                "block px-2 py-3 text-center text-xs",
                pathname === tab.href ? "font-bold text-brand-700" : "text-slate-500"
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn("h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-brand-300 focus:ring", className)}
      {...props}
    >
      {children}
    </select>
  );
}

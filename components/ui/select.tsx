import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-xl border theme-divider bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none focus:ring focus:ring-brand-300",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

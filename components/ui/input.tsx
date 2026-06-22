import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full cursor-text rounded-xl border theme-divider bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted-soft)] focus:ring focus:ring-brand-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-soft)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--ink)]",
        className
      )}
      {...props}
    />
  );
}

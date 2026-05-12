import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-soft", className)}>
      {children}
    </div>
  );
}

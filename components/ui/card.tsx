import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn("surface-card rounded-2xl p-4 text-[var(--ink)]", className)}>
      {children}
    </div>
  );
}

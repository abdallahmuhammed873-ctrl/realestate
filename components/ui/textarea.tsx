import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-brand-300 focus:ring",
        className
      )}
      {...props}
    />
  );
}

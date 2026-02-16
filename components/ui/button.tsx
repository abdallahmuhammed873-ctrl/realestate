import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const variants: Record<Variant, string> = {
    primary: "bg-brand-700 text-white hover:bg-brand-800",
    secondary: "bg-cheque text-slate-900 hover:opacity-90",
    outline: "border border-slate-300 bg-white hover:bg-slate-50",
    ghost: "bg-transparent hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const variants: Record<Variant, string> = {
    primary: "bg-[var(--brand)] text-[var(--brand-contrast)] hover:bg-[var(--brand-strong)]",
    secondary: "bg-[var(--cheque)] text-[var(--cheque-ink)] hover:opacity-90",
    outline: "border theme-divider bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-soft)]",
    ghost: "bg-transparent text-[var(--ink)] hover:bg-[var(--surface-soft)]",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

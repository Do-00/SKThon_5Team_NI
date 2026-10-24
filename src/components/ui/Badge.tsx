import type { HTMLAttributes } from "react";
import { cn } from "./utils";

export type BadgeTone = "neutral" | "brand" | "good" | "caution" | "warn" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-[var(--surface-sunken)] text-[var(--text-body)]",
  brand: "bg-[var(--surface-brand-soft)] text-[var(--teal-700)]",
  good: "bg-[var(--status-good-soft)] text-[var(--status-good)]",
  caution: "bg-[var(--status-caution-soft)] text-[var(--status-caution)]",
  warn: "bg-[var(--status-warn-soft)] text-[var(--status-warn)]",
  danger: "bg-[var(--status-danger-soft)] text-[var(--status-danger)]",
};

/** Server Component — small status/label pill. Pair with a status tone to echo the app's grade/status palette. */
export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[var(--space-1)] rounded-[var(--radius-pill)] px-[var(--space-3)] py-[2px] text-[var(--text-caption-size)] font-[var(--weight-medium)] leading-[var(--text-caption-lh)]",
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    />
  );
}

import type { HTMLAttributes } from "react";
import { cn } from "./utils";

export type TagTone = "neutral" | "teal" | "celadon" | "vanilla" | "peach" | "brick";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone;
}

const TONE_CLASSES: Record<TagTone, string> = {
  neutral: "border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-body)]",
  teal: "border-[var(--teal-300)] bg-[var(--teal-50)] text-[var(--teal-700)]",
  celadon: "border-[var(--celadon-400)] bg-[var(--celadon-100)] text-[var(--celadon-700)]",
  vanilla: "border-[var(--vanilla-400)] bg-[var(--vanilla-100)] text-[var(--vanilla-700)]",
  peach: "border-[var(--peach-500)] bg-[var(--peach-100)] text-[var(--peach-700)]",
  brick: "border-[var(--brick-600)] bg-[var(--brick-100)] text-[var(--brick-700)]",
};

/** Server Component — bordered category/filter tag, distinct from `Badge` (which is a status pill). */
export function Tag({ tone = "neutral", className, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[var(--space-1)] rounded-[var(--radius-sm)] border px-[var(--space-2)] py-[1px] text-[var(--text-caption-size)] font-[var(--weight-medium)]",
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    />
  );
}

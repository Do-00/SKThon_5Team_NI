import { cn } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-md)] font-[var(--weight-bold)] tracking-[var(--tracking-normal)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] whitespace-nowrap disabled:pointer-events-none disabled:opacity-50";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--action-primary)] text-[var(--text-on-primary)] hover:bg-[var(--action-primary-hover)] active:bg-[var(--action-primary-press)]",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-strong)] hover:bg-[var(--surface-sunken)]",
  outline:
    "border border-[var(--border-brand)] bg-transparent text-[var(--action-primary)] hover:bg-[var(--surface-brand-soft)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--text-body)] hover:bg-[var(--surface-sunken)]",
  danger:
    "border border-transparent bg-[var(--status-danger)] text-[var(--text-on-primary)] hover:bg-[var(--brick-700)]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 px-[var(--space-3)] text-[var(--text-caption-size)]",
  md: "h-11 px-[var(--space-4)] text-[var(--text-label-size)]",
  lg: "h-[var(--hit-min)] px-[var(--space-6)] text-[var(--text-body-size)]",
};

export interface ButtonClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/** Shared class builder used by both `Button` and `ButtonLink` so the two stay visually identical. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: ButtonClassOptions): string {
  return cn(BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], fullWidth && "w-full", className);
}

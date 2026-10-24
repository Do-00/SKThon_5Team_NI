import type { HTMLAttributes } from "react";
import { cn } from "./utils";

export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardElevation = "flat" | "card" | "raised";
export type CardTone = "default" | "brand" | "sunken" | "accent";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  elevation?: CardElevation;
  /** Surface color: white (default), teal-tinted `brand`, grey `sunken`, or celadon `accent`. */
  tone?: CardTone;
  /** Adds a hover elevation transition for clickable/linked cards. */
  interactive?: boolean;
}

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-[var(--space-4)]",
  md: "p-[var(--pad-card)]",
  lg: "p-[var(--pad-section)]",
};

const ELEVATION_CLASSES: Record<CardElevation, string> = {
  flat: "shadow-none",
  card: "shadow-[var(--shadow-card)]",
  raised: "shadow-[var(--shadow-raised)]",
};

const TONE_CLASSES: Record<CardTone, string> = {
  default: "border-[var(--border-subtle)] bg-[var(--surface-card)]",
  brand: "border-[var(--teal-100)] bg-[var(--surface-brand-soft)]",
  sunken: "border-transparent bg-[var(--surface-sunken)]",
  accent: "border-[var(--celadon-400)] bg-[var(--surface-accent-soft)]",
};

/** Server Component — purely presentational surface, no interactivity of its own. */
export function Card({
  padding = "md",
  elevation = "card",
  tone = "default",
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border",
        TONE_CLASSES[tone],
        PADDING_CLASSES[padding],
        ELEVATION_CLASSES[elevation],
        interactive &&
          "transition-shadow duration-[var(--dur-base)] ease-[var(--ease-standard)] hover:shadow-[var(--shadow-raised)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-[var(--space-4)] flex flex-col gap-[var(--space-1)]", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("eco-subhead text-[var(--text-strong)]", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-[var(--text-caption-size)] text-[var(--text-muted)]", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-[var(--text-body)]", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-[var(--space-4)] flex items-center gap-[var(--space-3)]", className)}
      {...props}
    />
  );
}

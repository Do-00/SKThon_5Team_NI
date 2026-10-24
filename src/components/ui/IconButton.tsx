"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "./utils";
import { Icon, type IconName } from "./icons";

export type IconButtonVariant = "solid" | "soft" | "ghost" | "outline";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Icon to render. */
  icon: IconName;
  /** Required accessible name — IconButtons have no visible text. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Override the icon's pixel size (defaults based on `size`). */
  iconSize?: number;
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  solid:
    "bg-[var(--action-primary)] text-[var(--text-on-primary)] border border-transparent hover:bg-[var(--action-primary-hover)] active:bg-[var(--action-primary-press)]",
  soft: "bg-[var(--surface-brand-soft)] text-[var(--teal-700)] border border-transparent hover:bg-[var(--teal-100)]",
  ghost:
    "bg-transparent text-[var(--text-body)] border border-transparent hover:bg-[var(--surface-sunken)]",
  outline:
    "bg-[var(--surface-card)] text-[var(--text-strong)] border border-[var(--border-strong)] hover:bg-[var(--surface-sunken)]",
};

const SIZE_CLASSES: Record<IconButtonSize, { box: string; icon: number }> = {
  sm: { box: "h-9 w-9", icon: 16 },
  md: { box: "h-11 w-11", icon: 20 },
  lg: { box: "h-14 w-14", icon: 24 },
};

/**
 * Icon-only action button. Always requires a `label`, which is used as
 * both the accessible name (`aria-label`) and a native `title` tooltip.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon,
      label,
      variant = "ghost",
      size = "md",
      iconSize,
      className,
      type = "button",
      ...props
    },
    ref
  ) {
    const sizing = SIZE_CLASSES[size];
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] disabled:pointer-events-none disabled:opacity-50",
          sizing.box,
          VARIANT_CLASSES[variant],
          className
        )}
        {...props}
      >
        <Icon name={icon} size={iconSize ?? sizing.icon} />
      </button>
    );
  }
);

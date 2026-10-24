"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button-styles";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

/**
 * Base interactive button. Client Component because it owns event handling
 * (`onClick`, etc.). For navigation, use `ButtonLink` instead — it stays a
 * Server Component and renders `next/link`.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    fullWidth,
    loading = false,
    leadingIcon,
    trailingIcon,
    className,
    disabled,
    children,
    type = "button",
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-[var(--radius-pill)] border-[var(--border-width-strong)] border-current border-t-transparent"
        />
      ) : (
        leadingIcon
      )}
      {children ? <span>{children}</span> : null}
      {!loading ? trailingIcon : null}
      {loading ? <span className="sr-only">Loading</span> : null}
    </button>
  );
});

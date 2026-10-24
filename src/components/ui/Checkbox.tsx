"use client";

import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: ReactNode;
  description?: string;
}

/**
 * Client Component — a native `<input type="checkbox">` styled via
 * `accent-color`, so keyboard/screen-reader/indeterminate behavior all
 * come from the browser for free.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descId = description ? `${inputId}-description` : undefined;

  return (
    <div className="flex items-start gap-[var(--space-3)]">
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        aria-describedby={descId}
        className={cn(
          "mt-[2px] h-5 w-5 shrink-0 cursor-pointer rounded-[6px] border-[var(--border-width-strong)] border-[var(--border-strong)] accent-[var(--action-primary)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      {label || description ? (
        <div className="flex flex-col">
          {label ? (
            <label
              htmlFor={inputId}
              className="cursor-pointer text-[var(--text-body-size)] text-[var(--text-strong)]"
            >
              {label}
            </label>
          ) : null}
          {description ? (
            <p id={descId} className="text-[var(--text-caption-size)] text-[var(--text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

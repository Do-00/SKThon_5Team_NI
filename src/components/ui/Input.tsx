"use client";

import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  wrapperClassName?: string;
}

/** Client Component — a controlled/uncontrolled text input owns `onChange` wiring. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    leadingIcon,
    trailingIcon,
    className,
    wrapperClassName,
    id,
    "aria-describedby": describedBy,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedByIds = cn(describedBy, hintId, errorId) || undefined;

  return (
    <div className={cn("flex flex-col gap-[var(--space-1)]", wrapperClassName)}>
      {label ? (
        <label
          htmlFor={inputId}
          className="text-[var(--text-label-size)] font-[var(--weight-medium)] text-[var(--text-strong)]"
        >
          {label}
        </label>
      ) : null}
      <div className="relative flex items-center">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-[var(--space-3)] text-[var(--text-muted)]">
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 w-full rounded-[var(--radius-md)] border bg-[var(--surface-card)] px-[var(--space-3)] text-[var(--text-body-size)] text-[var(--text-strong)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-[var(--status-danger)]"
              : "border-[var(--border-strong)] focus:border-[var(--border-brand)]",
            leadingIcon ? "pl-[var(--space-10)]" : undefined,
            trailingIcon ? "pr-[var(--space-10)]" : undefined,
            className
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedByIds}
          {...props}
        />
        {trailingIcon ? (
          <span className="pointer-events-none absolute right-[var(--space-3)] text-[var(--text-muted)]">
            {trailingIcon}
          </span>
        ) : null}
      </div>
      {hint && !error ? (
        <p id={hintId} className="text-[var(--text-caption-size)] text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-[var(--text-caption-size)] text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
});

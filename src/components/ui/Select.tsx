"use client";

import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "./utils";
import { Icon } from "./icons";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

/**
 * Client Component — styled wrapper around a native `<select>`. Kept
 * native (rather than a custom listbox) for built-in keyboard, screen
 * reader, and mobile picker support with zero extra code.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, placeholder, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="flex flex-col gap-[var(--space-1)]">
      {label ? (
        <label
          htmlFor={selectId}
          className="text-[var(--text-label-size)] font-[var(--weight-medium)] text-[var(--text-strong)]"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          defaultValue={props.value === undefined ? "" : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(hintId, errorId) || undefined}
          className={cn(
            "h-11 w-full appearance-none rounded-[var(--radius-md)] border bg-[var(--surface-card)] px-[var(--space-3)] pr-[var(--space-10)] text-[var(--text-body-size)] text-[var(--text-strong)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-[var(--status-danger)]"
              : "border-[var(--border-strong)] focus:border-[var(--border-brand)]",
            className
          )}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          size={18}
          className="pointer-events-none absolute right-[var(--space-3)] top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
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

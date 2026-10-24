"use client";

import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: ReactNode;
  description?: string;
}

/**
 * Client Component — a native `<input type="checkbox" role="switch">`
 * repainted as a toggle track/thumb with Tailwind `checked:` variants.
 * All state (`checked`/`defaultChecked`/`onChange`) is native, so no
 * internal `useState` is needed here.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, description, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descId = description ? `${inputId}-description` : undefined;

  return (
    <div className="flex items-center gap-[var(--space-3)]">
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        role="switch"
        aria-describedby={descId}
        className={cn(
          "relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-[var(--radius-pill)] border border-[var(--border-strong)] bg-[var(--ink-200)] transition-colors duration-[var(--dur-base)] ease-[var(--ease-standard)] disabled:cursor-not-allowed disabled:opacity-50",
          "before:absolute before:left-[2px] before:top-[1px] before:h-4 before:w-4 before:rounded-full before:bg-[var(--paper)] before:shadow-[var(--shadow-card)] before:transition-transform before:duration-[var(--dur-base)] before:ease-[var(--ease-standard)] before:content-['']",
          "checked:border-[var(--action-primary)] checked:bg-[var(--action-primary)] checked:before:translate-x-5",
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

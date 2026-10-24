"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { cn } from "./utils";

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** Shared `name` for the native radios. Auto-generated if omitted. */
  name?: string;
  legend?: string;
  /** Accessible name when there is no visible `legend` (e.g. a nearby heading labels the group). */
  "aria-label"?: string;
  options: RadioOption[];
  /** Controlled selected value. */
  value?: string;
  /** Initial value for uncontrolled usage. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  orientation?: "vertical" | "horizontal";
  /** `card` renders each option as a large bordered, tappable tile (design system `Radio`). */
  variant?: "plain" | "card";
}

/**
 * Client Component — a set of native radio inputs sharing one `name`, so
 * grouping and keyboard behavior are entirely native. `onValueChange` is
 * the only piece of state management layered on top.
 */
export function RadioGroup({
  name,
  legend,
  "aria-label": ariaLabel,
  options,
  value,
  defaultValue,
  onValueChange,
  className,
  orientation = "vertical",
  variant = "plain",
}: RadioGroupProps) {
  const generatedName = useId();
  const groupName = name ?? generatedName;

  return (
    <fieldset className={cn("m-0 flex flex-col gap-[var(--space-2)] border-0 p-0", className)}>
      {legend ? (
        <legend className="mb-[var(--space-1)] text-[var(--text-label-size)] font-[var(--weight-medium)] text-[var(--text-strong)]">
          {legend}
        </legend>
      ) : null}
      <div
        role="radiogroup"
        aria-label={legend ?? ariaLabel}
        className={cn(
          "flex gap-[var(--space-3)]",
          orientation === "vertical" ? "flex-col" : "flex-row flex-wrap"
        )}
      >
        {options.map((option) => {
          const optionId = `${groupName}-${option.value}`;
          const input = (
            <input
              id={optionId}
              type="radio"
              name={groupName}
              value={option.value}
              disabled={option.disabled}
              checked={value !== undefined ? value === option.value : undefined}
              defaultChecked={value === undefined ? defaultValue === option.value : undefined}
              onChange={(event) => {
                if (event.target.checked) onValueChange?.(option.value);
              }}
              className={
                variant === "card"
                  ? "peer sr-only"
                  : "mt-[3px] h-5 w-5 shrink-0 cursor-pointer accent-[var(--action-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              }
            />
          );

          if (variant === "card") {
            return (
              <div key={option.value} className="relative">
                {input}
                <label
                  htmlFor={optionId}
                  className="flex min-h-[var(--hit-min)] cursor-pointer items-start gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-[var(--space-4)] py-[var(--space-3)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] peer-checked:border-[var(--border-brand)] peer-checked:bg-[var(--surface-brand-soft)] peer-checked:shadow-[inset_0_0_0_1px_var(--border-brand)] peer-focus-visible:shadow-[var(--ring-focus)] peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[2px] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--border-strong)] bg-[var(--surface-card)] [.peer:checked~label_&]:border-[var(--action-primary)]"
                  >
                    <span className="h-3.5 w-3.5 scale-0 rounded-full bg-[var(--action-primary)] transition-transform duration-[var(--dur-fast)] [.peer:checked~label_&]:scale-100" />
                  </span>
                  <span className="flex flex-col gap-[2px]">
                    <span className="text-[length:var(--text-body-lg-size)] font-bold text-[var(--text-strong)]">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              </div>
            );
          }

          return (
            <div key={option.value} className="flex items-start gap-[var(--space-3)]">
              {input}
              <div className="flex flex-col">
                <label
                  htmlFor={optionId}
                  className="cursor-pointer text-[var(--text-body-size)] text-[var(--text-strong)]"
                >
                  {option.label}
                </label>
                {option.description ? (
                  <p className="text-[var(--text-caption-size)] text-[var(--text-muted)]">
                    {option.description}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

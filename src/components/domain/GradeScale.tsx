"use client";

import { useState } from "react";
import { GRADE_ORDER, GRADES, PRIMARY_ENERGY_UNIT, type GradeCode } from "../../data/grades";
import { cn } from "../ui/utils";
import { getGradeColorVars } from "./grade-tokens";

export interface GradeScaleProps {
  /** The building's grade — its bar is raised and fully opaque. */
  /** `null` = 등급을 말하지 않는 건물(추정 보류). 척도만 보여 주고 강조하지 않는다. */
  value: GradeCode | null;
  /** Lets the user tap any grade to see its primary-energy range. */
  selectable?: boolean;
  /** Show the grade code under each bar. Defaults to true. */
  showLabels?: boolean;
  className?: string;
}

/** Primary-energy range for a grade, e.g. `"270 ~ 320"`, `"60 미만"`, `"370 이상"`. */
function requirementLabel(code: GradeCode): string {
  const { minPrimaryEnergyKwh: min, maxPrimaryEnergyKwh: max } = GRADES[code];
  if (max === null) return `${min} 이상`;
  if (min === 0) return `${max} 미만`;
  return `${min} ~ ${max}`;
}

/**
 * The 10-step grade scale as a row of bars, best (`1+++`) to worst (`7`).
 * Client Component: with `selectable`, the picked grade expands and a detail
 * row shows its annual primary-energy requirement.
 */
export function GradeScale({ value, selectable = false, showLabels = true, className }: GradeScaleProps) {
  const [picked, setPicked] = useState<GradeCode | null>(null);
  const open = selectable ? (picked ?? value) : null;

  return (
    <div className={cn("flex flex-col gap-[var(--space-3)]", className)}>
      <div
        role={selectable ? "group" : "img"}
        aria-label={value ? `건물 에너지효율등급 척도, 현재 건물은 ${GRADES[value].label}` : "건물 에너지효율등급 척도"}
        className="flex items-end gap-1"
      >
        {GRADE_ORDER.map((code) => {
          const current = value !== null && code === value;
          const expanded = code === open;
          const { color } = getGradeColorVars(code);
          const content = (
            <>
              <span
                aria-hidden="true"
                className="block w-full transition-[height,opacity] duration-[var(--dur-slow)] ease-[var(--ease-standard)]"
                style={{
                  height: expanded ? 96 : current ? 24 : 14,
                  borderRadius: expanded ? "var(--radius-sm)" : "var(--radius-pill)",
                  backgroundColor: `var(${color})`,
                  opacity: current || expanded ? 1 : 0.32,
                  outline: current && expanded ? "3px solid var(--ink-900)" : "none",
                  outlineOffset: 2,
                }}
              />
              {showLabels ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "whitespace-nowrap font-brand font-bold tracking-[-0.04em]",
                    code.length > 2 ? "text-[11px] sm:text-[14px]" : "text-[15px] sm:text-[18px]"
                  )}
                  style={{ color: current || expanded ? `var(${color})` : "var(--text-muted)" }}
                >
                  {code}
                </span>
              ) : null}
            </>
          );

          const cellClassName = "flex min-w-0 flex-1 flex-col items-center gap-1.5";
          if (!selectable) {
            return (
              <div key={code} className={cellClassName}>
                {content}
              </div>
            );
          }
          return (
            <button
              key={code}
              type="button"
              aria-pressed={expanded}
              aria-label={`${GRADES[code].label}${current ? " (현재 건물)" : ""}`}
              onClick={() => setPicked(code)}
              className={cn(cellClassName, "cursor-pointer rounded-[var(--radius-sm)]")}
            >
              {content}
            </button>
          );
        })}
      </div>

      {open ? (
        <div
          aria-live="polite"
          className="flex flex-wrap items-center gap-[var(--space-3)] rounded-[var(--radius-md)] px-[var(--space-4)] py-[var(--space-3)]"
          style={{
            backgroundColor: `var(${getGradeColorVars(open).soft})`,
            border: `2px solid var(${getGradeColorVars(open).color})`,
          }}
        >
          <span
            className="whitespace-nowrap font-brand text-[24px] font-black tracking-[-0.04em]"
            style={{ color: `var(${getGradeColorVars(open).color})` }}
          >
            {GRADES[open].label}
          </span>
          <span className="min-w-0 flex-1 text-[length:var(--text-body-size)] font-bold text-[var(--text-body)]">
            1차에너지소요량
          </span>
          <span className="whitespace-nowrap font-brand text-[24px] font-black text-[var(--text-strong)]">
            {requirementLabel(open)}
          </span>
          <span className="whitespace-nowrap text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
            {PRIMARY_ENERGY_UNIT}
          </span>
        </div>
      ) : null}
    </div>
  );
}

import type { GradeCode } from "../../data/grades";

const GRADE_VAR_SUFFIX: Record<GradeCode, string> = {
  "1+++": "1p3",
  "1++": "1p2",
  "1+": "1p1",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
};

/**
 * Text color that stays legible on each grade's solid fill. Precomputed with
 * the design system's `readableOn` rule (WCAG relative luminance: white vs
 * `--ink-900`, whichever contrasts more) against the hex values in
 * `src/app/globals.css` — recompute if the grade palette changes.
 */
const GRADE_ON_COLOR: Record<GradeCode, string> = {
  "1+++": "#ffffff",
  "1++": "#ffffff",
  "1+": "#ffffff",
  "1": "var(--ink-900)",
  "2": "var(--ink-900)",
  "3": "var(--ink-900)",
  "4": "var(--ink-900)",
  "5": "var(--ink-900)",
  "6": "var(--ink-900)",
  "7": "#ffffff",
};

export interface GradeColorVars {
  /** CSS custom property name for the grade's strong/foreground color, e.g. `"--grade-5"`. */
  color: string;
  /** CSS custom property name for the grade's soft/background tint, e.g. `"--grade-5-soft"`. */
  soft: string;
}

/** Resolves the CSS custom property names backing a grade's brand color (see `src/app/globals.css`). */
export function getGradeColorVars(grade: GradeCode): GradeColorVars {
  const suffix = GRADE_VAR_SUFFIX[grade];
  return { color: `--grade-${suffix}`, soft: `--grade-${suffix}-soft` };
}

/** CSS color for text/icons placed on the grade's solid `color` fill. */
export function getGradeOnColor(grade: GradeCode): string {
  return GRADE_ON_COLOR[grade];
}

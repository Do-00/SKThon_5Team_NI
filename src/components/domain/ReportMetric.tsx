export type ReportMetricTone = "neutral" | "good" | "caution" | "warn" | "danger";

export interface ReportMetricProps {
  label: string;
  /** Pre-formatted value, e.g. via `formatManwon`/`formatPercent` from `src/lib/format.ts`. */
  value: string;
  unit?: string;
  /** Short supporting note rendered as a colored pill below the value. */
  helpText?: string;
  tone?: ReportMetricTone;
  className?: string;
}

const TONE_VARS: Record<ReportMetricTone, { fg: string; bg: string }> = {
  neutral: { fg: "--text-strong", bg: "--surface-sunken" },
  good: { fg: "--status-good", bg: "--status-good-soft" },
  caution: { fg: "--status-caution", bg: "--status-caution-soft" },
  warn: { fg: "--status-warn", bg: "--status-warn-soft" },
  danger: { fg: "--status-danger", bg: "--status-danger-soft" },
};

/** Single-stat card for an Eco Check report figure (cost, emissions, percentile, savings, …). */
export function ReportMetric({ label, value, unit, helpText, tone = "neutral", className }: ReportMetricProps) {
  const toneVars = TONE_VARS[tone];

  return (
    <div
      className={[
        "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-[var(--pad-card)] shadow-[var(--shadow-card)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-[length:var(--text-label-size)] font-medium text-[var(--text-muted)]">{label}</p>
      <p className="eco-numeral mt-[var(--space-2)] text-[var(--text-strong)]">
        {value}
        {unit ? (
          <span className="ml-[var(--space-1)] text-[length:var(--text-subhead-size)] font-bold text-[var(--text-muted)]">
            {unit}
          </span>
        ) : null}
      </p>
      {helpText ? (
        <p
          className="mt-[var(--space-3)] inline-flex items-center rounded-[var(--radius-pill)] px-[var(--space-3)] py-[var(--space-1)] text-[length:var(--text-caption-size)] font-medium"
          style={{ color: `var(${toneVars.fg})`, backgroundColor: `var(${toneVars.bg})` }}
        >
          {helpText}
        </p>
      ) : null}
    </div>
  );
}

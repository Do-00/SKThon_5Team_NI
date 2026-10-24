import type { ReactNode } from "react";

export interface PageHeaderProps {
  /** Small label above the title, e.g. a section/category name. */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Right-aligned slot for buttons/links, e.g. a primary action. */
  actions?: ReactNode;
}

/** Top-of-page heading: eyebrow + title + description, with an optional action slot. */
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="eco-container flex flex-col gap-[var(--space-4)] py-[var(--space-10)] sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-[var(--space-2)]">
        {eyebrow ? (
          <span className="text-[length:var(--text-label-size)] font-bold uppercase tracking-[var(--tracking-wide)] text-[var(--text-link)]">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="eco-title">{title}</h1>
        {description ? (
          <p className="max-w-[var(--width-reading)] text-[length:var(--text-body-lg-size)] leading-[var(--text-body-lg-lh)] text-[var(--text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-[var(--space-3)]">{actions}</div> : null}
    </div>
  );
}

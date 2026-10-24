import Link from "next/link";
import { cn } from "../ui/utils";

export interface SectionHeaderAction {
  label: string;
  href: string;
}

export interface SectionHeaderProps {
  title: string;
  /** Short muted note on the right of the title, e.g. `"가입 없이 조회할 수 있습니다"`. */
  hint?: string;
  /** Use `"sm"` for long hints that would otherwise crowd the title. */
  hintSize?: "md" | "sm";
  /** Longer supporting copy rendered below the title row. */
  description?: string;
  action?: SectionHeaderAction;
  /** Heading level for the title. Defaults to `h2`. */
  as?: "h1" | "h2" | "h3";
  id?: string;
  className?: string;
}

/** Heading for a page section: title with an optional right-aligned hint or "see more" link. */
export function SectionHeader({
  title,
  hint,
  hintSize = "md",
  description,
  action,
  as = "h2",
  id,
  className,
}: SectionHeaderProps) {
  const Heading = as;
  return (
    <div className={cn("flex flex-col gap-[var(--space-1)]", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-4)] gap-y-[var(--space-1)]">
        <Heading
          id={id}
          className="font-brand text-[26px] font-black leading-[1.3] tracking-[var(--tracking-tight)] text-[var(--text-strong)] md:text-[30px]"
        >
          {title}
        </Heading>
        {hint || action ? (
          <div className="flex items-baseline gap-[var(--space-4)]">
            {hint ? (
              <span className={cn("text-[var(--text-muted)]", hintSize === "sm" ? "text-[13px]" : "text-[17px]")}>
                {hint}
              </span>
            ) : null}
            {action ? (
              <Link
                href={action.href}
                className="inline-flex items-center gap-[var(--space-1)] text-[length:var(--text-label-size)] font-medium text-[var(--text-link)] hover:underline"
              >
                {action.label}
                <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      {description ? (
        <p className="text-[length:var(--text-body-size)] text-[var(--text-muted)]">{description}</p>
      ) : null}
    </div>
  );
}

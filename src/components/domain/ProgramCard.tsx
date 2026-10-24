import Link from "next/link";
import type { SupportProgram } from "../../data/programs";
import { Badge } from "../ui/Badge";
import { Icon } from "../ui/icons";
import { cn } from "../ui/utils";

export interface ProgramCardProps {
  program: SupportProgram;
  /** Makes the whole card a link. */
  href?: string;
  /** Makes the whole card a button (e.g. to open a confirmation dialog). Ignored when `href` is set. */
  onSelect?: (program: SupportProgram) => void;
  /** How many of the program's topic tags to show. Defaults to 2. */
  maxTags?: number;
  className?: string;
}

/**
 * Deadline copy shared by the card and the leave-confirmation dialog.
 * `deadline` is the source research's free-text application period (e.g.
 * `"2026.3.3(화) ~ 3.27(금)"`, `"지자체 공고 참조"`) rather than a parseable
 * date for almost every real program, so this just normalizes the one
 * genuinely fixed value (`"상시"`) and otherwise passes the text through.
 */
export function formatProgramDeadline(deadline: SupportProgram["deadline"]): string {
  return deadline === "상시" ? "상시 접수" : deadline;
}

const SURFACE =
  "flex h-full w-full flex-col gap-[var(--space-3)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-[var(--pad-card)] text-left shadow-[var(--shadow-card)]";
const INTERACTIVE =
  "cursor-pointer transition-[box-shadow,transform] duration-[var(--dur-base)] ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]";

/**
 * Card summarizing a government/public building-energy support program:
 * agency, name, "맞춤" match badge, support amount, tags, and deadline.
 * Uses only phrasing content (spans) so it can render inside a `<button>`.
 */
export function ProgramCard({ program, href, onSelect, maxTags = 2, className }: ProgramCardProps) {
  const TitleTag = href || onSelect ? "span" : "h3";

  const body = (
    <>
      <span className="flex items-start gap-[var(--space-3)]">
        <span className="block min-w-0 flex-1">
          <span className="mb-1 block text-[length:var(--text-body-size)] text-[var(--text-muted)]">
            {program.provider}
          </span>
          <TitleTag className="block font-brand text-[length:var(--text-subhead-size)] font-bold leading-[1.35] tracking-[var(--tracking-tight)] text-[var(--text-strong)]">
            {program.name}
          </TitleTag>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          {program.matched ? (
            <Badge tone="good">
              <Icon name="badge-check" size={16} />
              맞춤
            </Badge>
          ) : null}
          {program.vulnerablePriority ? <Badge tone="caution">취약계층 우대</Badge> : null}
        </span>
      </span>

      <span className="flex items-start gap-[var(--space-2)]">
        <Icon name="coins" size={22} className="mt-0.5 shrink-0 text-[var(--teal-600)]" />
        <span className="font-brand text-[length:var(--text-body-lg-size)] font-bold leading-[1.4] text-[var(--teal-700)]">
          {program.amountLabel}
        </span>
      </span>

      <span className="mt-auto flex flex-col gap-[var(--space-2)]">
        <span className="flex min-w-0 flex-wrap gap-[var(--space-2)]">
          {program.tags.slice(0, maxTags).map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
        </span>
        <span className="inline-flex items-start gap-1.5 text-[length:var(--text-body-size)] text-[var(--text-muted)]">
          <Icon name="calendar" size={16} className="mt-0.5 shrink-0" />
          {formatProgramDeadline(program.deadline)}
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn(SURFACE, INTERACTIVE, className)}>
        {body}
      </Link>
    );
  }
  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(program)} className={cn(SURFACE, INTERACTIVE, className)}>
        {body}
      </button>
    );
  }
  return <article className={cn(SURFACE, className)}>{body}</article>;
}

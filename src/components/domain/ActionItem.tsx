import type { EcoAction, EcoActionDifficulty } from "../../data/actions";
import { Icon, type IconName } from "../ui/icons";
import { cn } from "../ui/utils";

export interface ActionItemProps {
  action: EcoAction;
  /** Renders the row as completed (check icon, struck-through title). */
  done?: boolean;
  /** Makes the row a toggle button; called with the action's id. */
  onToggle?: (actionId: string) => void;
  className?: string;
}

/** How much work an action takes, in the design system's wording. */
export const EFFORT_LABEL: Record<EcoActionDifficulty, string> = {
  easy: "바로 실천",
  medium: "소규모 공사",
  hard: "본격 리모델링",
};

const EFFORT_TONE_VARS: Record<EcoActionDifficulty, { fg: string; bg: string }> = {
  easy: { fg: "--status-good", bg: "--status-good-soft" },
  medium: { fg: "--status-caution", bg: "--status-caution-soft" },
  hard: { fg: "--status-warn", bg: "--status-warn-soft" },
};

const CATEGORY_ICON: Record<string, IconName> = {
  조명: "lightbulb",
  난방: "thermometer",
  단열: "wind",
  설비: "gauge",
};

function getActionIcon(action: EcoAction): IconName {
  if (action.category === "단열" && action.difficulty === "hard") return "hammer";
  return CATEGORY_ICON[action.category] ?? "leaf";
}

/** Compact row for a recommended eco action: effort-tinted icon, title, and effort level. */
export function ActionItem({ action, done = false, onToggle, className }: ActionItemProps) {
  const tone = EFFORT_TONE_VARS[action.difficulty];
  const surface =
    "flex min-h-[var(--hit-comfortable)] w-full items-center gap-[var(--space-4)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-[var(--space-4)] text-left";

  const content = (
    <>
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
        style={{ color: `var(${tone.fg})`, backgroundColor: `var(${tone.bg})` }}
      >
        <Icon name={done ? "check" : getActionIcon(action)} size={26} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "text-[length:var(--text-body-lg-size)] font-bold",
            done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-strong)]"
          )}
        >
          {action.title}
        </span>
        <span className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
          {EFFORT_LABEL[action.difficulty]}
        </span>
      </span>
    </>
  );

  if (onToggle) {
    return (
      <button
        type="button"
        aria-pressed={done}
        onClick={() => onToggle(action.id)}
        className={cn(
          surface,
          "cursor-pointer transition-colors duration-[var(--dur-fast)] hover:border-[var(--border-brand)]",
          className
        )}
      >
        {content}
        <Icon name="chevron-right" size={24} className="shrink-0 text-[var(--text-muted)]" />
        <span className="sr-only">{done ? "완료 표시 해제" : "완료로 표시"}</span>
      </button>
    );
  }

  return <div className={cn(surface, className)}>{content}</div>;
}

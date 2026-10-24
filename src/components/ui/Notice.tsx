import type { HTMLAttributes } from "react";
import { cn } from "./utils";
import { Icon, type IconName } from "./icons";

export type NoticeTone = "info" | "good" | "warn" | "danger";

export interface NoticeProps extends HTMLAttributes<HTMLDivElement> {
  tone?: NoticeTone;
}

const TONES: Record<NoticeTone, { className: string; icon: IconName }> = {
  info: { className: "bg-[var(--surface-brand-soft)] text-[var(--teal-800)]", icon: "info" },
  good: { className: "bg-[var(--status-good-soft)] text-[var(--status-good)]", icon: "circle-check" },
  warn: { className: "bg-[var(--status-warn-soft)] text-[var(--status-warn)]", icon: "triangle-alert" },
  danger: { className: "bg-[var(--status-danger-soft)] text-[var(--status-danger)]", icon: "triangle-alert" },
};

/**
 * Server Component — inline, non-dismissable status banner (the design
 * system's static `Toast`). For transient pop-up messages use `useToast`.
 */
export function Notice({ tone = "info", className, children, role = "note", ...props }: NoticeProps) {
  const { className: toneClassName, icon } = TONES[tone];
  return (
    <div
      role={role}
      className={cn(
        "flex items-center gap-[var(--space-3)] rounded-[var(--radius-md)] p-[var(--space-4)] text-[length:var(--text-body-size)] font-medium shadow-[var(--shadow-card)]",
        toneClassName,
        className
      )}
      {...props}
    >
      <Icon name={icon} size={24} className="shrink-0" />
      <p className="flex-1">{children}</p>
    </div>
  );
}

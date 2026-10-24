import type { ReactNode } from "react";
import Link from "next/link";

export interface SidebarItem {
  label: string;
  href: string;
  active?: boolean;
  icon?: ReactNode;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  /** Optional heading rendered above all sections, e.g. "마이페이지" or "관리자". */
  heading?: string;
  className?: string;
}

/** Vertical section nav for account/admin pages. */
export function Sidebar({ sections, heading, className }: SidebarProps) {
  return (
    <nav
      aria-label={heading ?? "보조 메뉴"}
      className={["flex w-full shrink-0 flex-col gap-[var(--space-6)] sm:w-64", className].filter(Boolean).join(" ")}
    >
      {heading ? <p className="eco-subhead text-[var(--text-strong)]">{heading}</p> : null}
      {sections.map((section, index) => (
        <div key={section.title ?? index} className="flex flex-col gap-[var(--space-1)]">
          {section.title ? (
            <p className="px-[var(--space-3)] text-[length:var(--text-caption-size)] font-bold uppercase tracking-[var(--tracking-wide)] text-[var(--text-muted)]">
              {section.title}
            </p>
          ) : null}
          <ul className="flex flex-col gap-[var(--space-1)]">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-label-size)] font-medium text-[var(--text-body)] hover:bg-[var(--surface-sunken)] aria-[current=page]:bg-[var(--surface-brand-soft)] aria-[current=page]:font-bold aria-[current=page]:text-[var(--text-link)]"
                >
                  {item.icon ? (
                    <span aria-hidden="true" className="shrink-0">
                      {item.icon}
                    </span>
                  ) : null}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

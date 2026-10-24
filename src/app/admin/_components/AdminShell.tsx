import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "../../../components/ui";
import { ADMIN_NAV, type AdminNavKey, getAdminNavEntry } from "../_lib/nav";
import { AdminMobileNav } from "./AdminMobileNav";

export interface AdminShellProps {
  /** Which admin sub-route is currently active, for the sidebar/mobile drawer. */
  active: AdminNavKey;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Server Component shell shared by every `/admin/**` page: a responsive
 * dark teal sidebar (desktop) with a matching mobile drawer, a subtle
 * prototype-data notice, and the page content. `AdminMobileNav` is the only
 * Client Component pulled into this tree.
 *
 * Each page passes its own `active` key explicitly, the same pattern as
 * `MypageShell` — Server Components can't read the current route
 * themselves, so the sidebar's `aria-current` state is computed by the
 * caller rather than via `usePathname()`.
 */
export function AdminShell({ active, title, description, children }: AdminShellProps) {
  const activeEntry = getAdminNavEntry(active);

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <header className="relative z-30 flex items-center justify-between gap-[var(--space-4)] bg-[var(--teal-900)] px-[var(--gutter-screen)] py-[var(--space-4)] md:hidden">
        <Link href="/admin" className="flex items-center gap-[var(--space-2)]" aria-label="에코체크 관리자 홈으로 이동">
          <Icon name="leaf" size={22} className="text-[var(--celadon-400)]" />
          <span className="eco-heading text-[var(--paper)]">에코체크 관리자</span>
        </Link>
        <AdminMobileNav items={ADMIN_NAV} activeHref={activeEntry.href} />
      </header>

      <aside className="hidden shrink-0 flex-col bg-[var(--teal-900)] text-[var(--teal-100)] md:flex md:w-64">
        <div className="flex h-[var(--app-bar-height)] items-center gap-[var(--space-2)] border-b border-[var(--teal-800)] px-[var(--space-6)]">
          <Icon name="leaf" size={22} className="text-[var(--celadon-400)]" />
          <span className="eco-heading text-[var(--paper)]">에코체크 관리자</span>
        </div>

        <nav aria-label="관리자 메뉴" className="flex flex-1 flex-col gap-[var(--space-1)] px-[var(--space-4)] py-[var(--space-6)]">
          {ADMIN_NAV.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              aria-current={entry.key === active ? "page" : undefined}
              className="flex items-center gap-[var(--space-3)] rounded-[var(--radius-md)] px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-label-size)] font-medium text-[var(--teal-100)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--teal-800)] hover:text-[var(--paper)] aria-[current=page]:bg-[var(--teal-700)] aria-[current=page]:font-bold aria-[current=page]:text-[var(--paper)]"
            >
              <Icon name={entry.icon} size={18} />
              <span>{entry.label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-[var(--teal-800)] px-[var(--space-4)] py-[var(--space-4)]">
          <Link
            href="/"
            className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-caption-size)] font-medium text-[var(--teal-300)] hover:bg-[var(--teal-800)] hover:text-[var(--paper)]"
          >
            <Icon name="arrow-left" size={16} />
            <span>서비스 홈으로</span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          role="note"
          aria-label="프로토타입 안내"
          className="border-b border-[var(--border-subtle)] bg-[var(--surface-brand-soft)]"
        >
          <div className="flex items-center gap-[var(--space-2)] px-[var(--gutter-screen)] py-[var(--space-2)] text-[length:var(--text-caption-size)] text-[var(--teal-700)] md:px-[var(--space-8)]">
            <Icon name="info" size={16} />
            <p>
              이 관리자 화면은 프로토타입으로, 실제 권한 검증 없이 목업(mock) 데이터로만 동작하는 화면
              구조 확인용입니다.
            </p>
          </div>
        </div>

        <main className="flex flex-1 flex-col gap-[var(--space-8)] px-[var(--gutter-screen)] py-[var(--space-8)] md:px-[var(--space-8)]">
          <div className="flex flex-col gap-[var(--space-2)]">
            <h1 className="eco-title">{title}</h1>
            {description ? (
              <p className="max-w-[var(--width-reading)] text-[length:var(--text-body-lg-size)] leading-[var(--text-body-lg-lh)] text-[var(--text-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

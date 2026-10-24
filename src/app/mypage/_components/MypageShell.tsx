import type { ReactNode } from "react";
import { AppBar, PageHeader, SiteFooter } from "../../../components/layout";
import { Sidebar } from "../../../components/domain";
import type { SidebarSection } from "../../../components/domain";
import { Icon } from "../../../components/ui";
import { MYPAGE_NAV, type MypageNavKey } from "../_lib/nav";
import { LogoutButton } from "./LogoutButton";

export interface MypageShellProps {
  /** Which mypage sub-route is currently active, for the sidebar/app bar. */
  active: MypageNavKey;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Server Component shell shared by every `/mypage/**` page: app bar, a
 * subtle prototype-data notice, the account sidebar, page heading, and the
 * footer. The only Client Component inside it is `LogoutButton`.
 *
 * Each page passes its own `active` key explicitly — Server Components
 * can't read the current route themselves (see `src/components/layout/nav-types.ts`),
 * and this avoids turning the whole shell into a Client Component just to
 * call `usePathname()`.
 */
export function MypageShell({ active, title, description, children }: MypageShellProps) {
  const sections: SidebarSection[] = [
    {
      title: "마이페이지",
      items: MYPAGE_NAV.map((entry) => ({
        label: entry.label,
        href: entry.href,
        active: entry.key === active,
        icon: <Icon name={entry.icon} size={18} />,
      })),
    },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppBar />

      <div
        role="note"
        aria-label="프로토타입 안내"
        className="border-b border-[var(--border-subtle)] bg-[var(--surface-brand-soft)]"
      >
        <div className="eco-container flex items-center gap-[var(--space-2)] py-[var(--space-2)] text-[length:var(--text-caption-size)] text-[var(--teal-700)]">
          <Icon name="info" size={16} />
          <p>
            이 마이페이지는 프로토타입 화면으로, 실제 로그인 세션 없이 목업(mock) 데이터로만 동작합니다.
          </p>
        </div>
      </div>

      <PageHeader title={title} description={description} />

      <main className="eco-container flex flex-1 flex-col gap-[var(--space-8)] pb-[var(--space-16)] sm:flex-row sm:items-start sm:gap-[var(--space-10)]">
        <div className="flex w-full shrink-0 flex-col gap-[var(--space-6)] sm:w-64">
          <Sidebar heading="메뉴" sections={sections} />
          <LogoutButton />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-8)]">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}

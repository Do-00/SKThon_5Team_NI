import type { Metadata } from "next";
import { Icon } from "../../../components/ui";
import type { IconName } from "../../../components/ui";
import { AdminShell } from "../_components/AdminShell";

export const metadata: Metadata = {
  title: "관리자 설정",
};

interface SettingsGroup {
  icon: IconName;
  title: string;
  description: string;
}

const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  {
    icon: "bell",
    title: "알림 설정",
    description: "신규 신청, 심사 마감 임박 등 관리자 알림 조건을 구성합니다.",
  },
  {
    icon: "user",
    title: "권한 관리",
    description: "관리자 계정별 접근 권한과 역할을 관리합니다.",
  },
  {
    icon: "check",
    title: "심사 기준",
    description: "지원사업별 자동/수동 심사 기준을 설정합니다.",
  },
  {
    icon: "info",
    title: "감사 로그",
    description: "신청 승인/반려 등 관리자 작업 이력을 조회합니다.",
  },
];

/**
 * Framework screen: the route and sidebar entry exist and are navigable,
 * but each settings group is a placeholder — there is no real
 * auth/config backend in this prototype, so nothing here is editable yet.
 */
export default function AdminSettingsPage() {
  return (
    <AdminShell
      active="settings"
      title="설정"
      description="관리자 알림, 권한, 심사 기준, 감사 로그를 위한 화면 구조입니다."
    >
      <ul className="grid grid-cols-1 gap-[var(--gap-card)] sm:grid-cols-2">
        {SETTINGS_GROUPS.map((group) => (
          <li
            key={group.title}
            className="flex flex-col gap-[var(--space-3)] rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-card)] p-[var(--pad-card)]"
          >
            <div className="flex items-center gap-[var(--space-3)]">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-sunken)] text-[var(--teal-700)]"
              >
                <Icon name={group.icon} size={18} />
              </span>
              <h2 className="eco-subhead text-[var(--text-strong)]">{group.title}</h2>
            </div>
            <p className="text-[length:var(--text-body-size)] text-[var(--text-body)]">{group.description}</p>
            <span className="inline-flex w-fit items-center rounded-[var(--radius-pill)] bg-[var(--surface-sunken)] px-[var(--space-3)] py-[var(--space-1)] text-[length:var(--text-caption-size)] font-medium text-[var(--text-muted)]">
              준비 중
            </span>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}

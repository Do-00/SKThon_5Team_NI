import type { IconName } from "../../../components/ui";

/**
 * Local route metadata for the 관리자(admin) prototype. Enumerates the
 * section's own sub-routes so the dark sidebar and mobile drawer inside
 * `src/app/admin/**` stay in sync with the actual folder structure.
 */

export type AdminNavKey = "dashboard" | "applications" | "buildings" | "settings";

export interface AdminNavEntry {
  key: AdminNavKey;
  label: string;
  href: string;
  icon: IconName;
  description: string;
}

export const ADMIN_NAV: readonly AdminNavEntry[] = [
  {
    key: "dashboard",
    label: "대시보드",
    href: "/admin",
    icon: "home",
    description: "플랫폼 전체 현황과 최근 신청 내역을 확인합니다.",
  },
  {
    key: "applications",
    label: "신청 관리",
    href: "/admin/applications",
    icon: "check",
    description: "지원사업 신청 건을 상태별로 확인합니다.",
  },
  {
    key: "buildings",
    label: "건물 관리",
    href: "/admin/buildings",
    icon: "building",
    description: "에코체크가 실행된 건물 목록을 확인합니다.",
  },
  {
    key: "settings",
    label: "설정",
    href: "/admin/settings",
    icon: "info",
    description: "관리자 알림, 권한, 감사 로그 설정 영역입니다.",
  },
];

export function getAdminNavEntry(key: AdminNavKey): AdminNavEntry {
  const entry = ADMIN_NAV.find((item) => item.key === key);
  if (!entry) {
    throw new Error(`Unknown admin nav key: ${key}`);
  }
  return entry;
}

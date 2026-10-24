import type { IconName } from "../../../components/ui";

/**
 * Local route metadata for the 마이페이지(mypage) section. Not a shared
 * fixture under `src/data/` — this simply enumerates the section's own
 * sub-routes so the sidebar and cross-links inside `src/app/mypage/**`
 * stay in sync with the actual folder structure.
 */

export type MypageNavKey =
  | "overview"
  | "buildings"
  | "applications"
  | "notifications"
  | "account";

export interface MypageNavEntry {
  key: MypageNavKey;
  label: string;
  href: string;
  icon: IconName;
  description: string;
}

export const MYPAGE_NAV: readonly MypageNavEntry[] = [
  {
    key: "overview",
    label: "홈",
    href: "/mypage",
    icon: "home",
    description: "계정 요약과 최근 활동을 한눈에 확인합니다.",
  },
  {
    key: "buildings",
    label: "저장한 건물",
    href: "/mypage/buildings",
    icon: "building",
    description: "에코체크를 실행한 건물을 저장하고 다시 확인합니다.",
  },
  {
    key: "applications",
    label: "신청 내역",
    href: "/mypage/applications",
    icon: "check",
    description: "지원사업 신청 현황과 처리 상태를 확인합니다.",
  },
  {
    key: "notifications",
    label: "알림",
    href: "/mypage/notifications",
    icon: "bell",
    description: "신청 처리, 등급 갱신 등 주요 알림을 확인합니다.",
  },
  {
    key: "account",
    label: "계정 설정",
    href: "/mypage/account",
    icon: "user",
    description: "계정 정보와 알림 수신 설정을 관리합니다.",
  },
];

export function getMypageNavEntry(key: MypageNavKey): MypageNavEntry {
  const entry = MYPAGE_NAV.find((item) => item.key === key);
  if (!entry) {
    throw new Error(`Unknown mypage nav key: ${key}`);
  }
  return entry;
}

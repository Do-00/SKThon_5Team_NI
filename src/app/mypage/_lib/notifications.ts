/**
 * Local mock notification feed for the 마이페이지 프로토타입.
 *
 * There is no `notifications` fixture under `src/data/` yet, so this file
 * holds page-scoped mock data (not a shared fixture) that mirrors the shape
 * of the other `src/data/*.ts` accessors — a typed record plus an async
 * getter — so it can be swapped for a real fixture/API later without
 * touching the pages that consume it.
 */

export type NotificationCategory = "application" | "grade" | "program" | "account";

export interface AccountNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  read: boolean;
}

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  application: "신청 현황",
  grade: "등급 갱신",
  program: "지원사업",
  account: "계정",
};

const NOTIFICATIONS: readonly AccountNotification[] = [
  {
    id: "note-001",
    category: "application",
    title: "건물 에너지효율화 사업(BRP) 융자지원 접수 완료",
    body: "월드컵파크 10단지 신청 건이 접수되었습니다. 담당 기관 심사 후 결과를 알려드립니다.",
    createdAt: "2026-09-09T11:25:00+09:00",
    read: false,
  },
  {
    id: "note-002",
    category: "grade",
    title: "저장한 건물의 에코체크 등급이 갱신되었습니다",
    body: "월드컵파크 10단지의 에너지효율등급이 최신 데이터로 다시 산정되었습니다.",
    createdAt: "2026-09-08T09:00:00+09:00",
    read: false,
  },
  {
    id: "note-003",
    category: "application",
    title: "온실가스 감축설비 지원사업 승인",
    body: "월드컵파크 10단지의 온실가스 감축설비 지원사업 신청이 승인되었습니다.",
    createdAt: "2026-09-03T16:35:00+09:00",
    read: true,
  },
  {
    id: "note-004",
    category: "program",
    title: "서울시 그린리모델링 이자 지원사업 마감 임박",
    body: "관심 지원사업의 신청 마감일이 2026.11.30로 다가오고 있습니다.",
    createdAt: "2026-08-30T10:00:00+09:00",
    read: true,
  },
  {
    id: "note-005",
    category: "account",
    title: "마이페이지에 오신 것을 환영합니다",
    body: "저장한 건물과 지원사업 신청 내역을 마이페이지에서 모아볼 수 있습니다.",
    createdAt: "2026-08-12T09:20:00+09:00",
    read: true,
  },
];

export function getNotificationCategoryLabel(category: NotificationCategory): string {
  return CATEGORY_LABEL[category];
}

/** Returns the current user's notification feed, newest first. */
export async function getAccountNotifications(): Promise<AccountNotification[]> {
  return [...NOTIFICATIONS];
}

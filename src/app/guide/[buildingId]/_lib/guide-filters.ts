import type { EcoAction } from "@/src/data/actions";
import { REMODEL_MEASURES } from "@/src/lib/remodel-report";

/**
 * Route-local filter vocabulary for the guide checklist. Every value here is
 * derived deterministically from fields that already exist on `EcoAction`
 * (`eligibleUserTypes`) — no fixture data is changed or duplicated.
 */

export type AudienceFilter = "owner" | "tenant" | "hoa" | "corporation";

/** 주거(아파트·주택)인지, 상가·사무실·학교 같은 비주거인지 — 고를 수 있는 사용자 유형이 달라진다. */
export type BuildingKind = "residential" | "nonResidential";

export interface AudienceOption {
  value: AudienceFilter;
  label: string;
  description: string;
}

const RESIDENTIAL_AUDIENCES: AudienceOption[] = [
  { value: "owner", label: "소유주", description: "직접 소유한 집이에요" },
  { value: "tenant", label: "임차인", description: "전·월세로 살고 있어요" },
  { value: "hoa", label: "입주자대표회의·관리단", description: "외벽·지붕 같은 공용부를 함께 결정해요" },
];

const NON_RESIDENTIAL_AUDIENCES: AudienceOption[] = [
  { value: "owner", label: "건물주", description: "건물을 소유하고 있어요" },
  { value: "tenant", label: "입주 사업자", description: "상가·사무실을 임차해 쓰고 있어요" },
  { value: "corporation", label: "법인·공공기관 담당자", description: "회사·학교·복지시설 건물을 관리해요" },
];

export function audienceOptionsFor(kind: BuildingKind): AudienceOption[] {
  return kind === "residential" ? RESIDENTIAL_AUDIENCES : NON_RESIDENTIAL_AUDIENCES;
}


export interface GuideFilterState {
  audience: AudienceFilter;
}

export const DEFAULT_GUIDE_FILTER_STATE: GuideFilterState = {
  audience: "owner",
};

const REMODEL_ORDER: readonly string[] = REMODEL_MEASURES.map((measure) => measure.code);

/**
 * 성적표의 AI 리모델링 리포트가 추천한 순서(절감률이 큰 순 — 외벽 → 창호 → 환기 →
 * 보일러 → 지붕 → LED)로 정렬한다. beec measure 에 걸리지 않는 항목은 맨 뒤.
 */
export function sortByRecommendedRemodel(actions: EcoAction[]): EcoAction[] {
  const rank = (action: EcoAction) => {
    const index = action.measureCode ? REMODEL_ORDER.indexOf(action.measureCode) : -1;
    return index === -1 ? REMODEL_ORDER.length : index;
  };
  return [...actions].sort((a, b) => rank(a) - rank(b));
}

/** Applies the user-type filter to the full action list. */
export function filterActions(actions: EcoAction[], filters: GuideFilterState): EcoAction[] {
  return actions.filter((action) => action.eligibleUserTypes.includes(filters.audience));
}

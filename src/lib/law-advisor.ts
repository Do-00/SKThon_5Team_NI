/**
 * 검색형 AI 상담(/api/advisor)의 공용 타입과 규칙 계산.
 *
 * 역할 분담:
 *  - 숫자(절감률 누적, 이자지원 요건 판정, 최소 조합)는 여기서 결정적으로 계산한다.
 *  - Gemini 는 근거 조문을 골라 쉬운 말로 설명하는 일만 한다.
 * 이렇게 나눠야 AI 가 숫자를 지어내도 화면 숫자가 틀어지지 않는다.
 *
 * 브라우저에서도 import 하므로 Node 전용 모듈을 쓰지 않는다.
 */
import { REMODEL_MEASURES } from "@/src/lib/remodel-report";

export type MeasureCode = (typeof REMODEL_MEASURES)[number]["code"];
export type AdvisorAudience = "owner" | "tenant";

/** 등급을 어떤 수준으로 말할 수 있는지 — 상담 문구의 단정 수위를 정한다. */
export type GradeStatus = "certified" | "estimated" | "range" | "refused" | "unknown";

export interface AdvisorBuilding {
  name: string;
  useType: string;
  completionYear: number | null;
  insulationEra: string | null;
  heatingType: string | null;
  /** 화면에 보이는 그대로, 예: "1등급", "1~3등급 범위". 말할 수 없으면 `null`. */
  gradeLabel: string | null;
  gradeStatus: GradeStatus;
  primaryEnergyKwh: number | null;
  /** 주소의 시·도(예: "서울특별시"). 다른 지역 전용 지원사업을 근거에서 빼는 데 쓴다. */
  region?: string | null;
}

export interface AdvisorRequest {
  question: string;
  building: AdvisorBuilding;
  audience: AdvisorAudience;
}

export interface AdvisorCitation {
  id: string;
  source: string;
  kind: string;
  article: string;
  title: string | null;
  url: string;
  /** 조문 앞부분 — 카드에서 바로 확인하라고. */
  excerpt: string;
  /** AI 가 인용한 문장. 원문에 실제로 있다고 서버가 확인한 것만 담는다. */
  quote?: string;
  /** `quote` 가 원문 대조를 통과했는지. 통과하지 못하면 `false`(인용 문장은 화면에 쓰지 않는다). */
  quoteVerified: boolean;
}

export interface AdvisorAction {
  code: MeasureCode;
  title: string;
  reductionPct: number;
  /** 1(적음) ~ 3(큼). 공사 규모의 상대 비교용. */
  costLevel: 1 | 2 | 3;
  reason: string;
  /** 이 사용자가 혼자 결정할 수 없는 이유, 예: "단지 합의 필요". */
  needs: string | null;
  citationIds: string[];
}

export interface SubsidyCheck {
  /** 고른 조치를 모두 했을 때 1차에너지소요량 감소율(%) — 곱으로 누적. */
  reductionPercent: number;
  tier: "preferred" | "general" | "below";
  label: string;
}

export interface AdvisorResponse {
  source: "gemini" | "fallback";
  answer: string;
  actions: AdvisorAction[];
  subsidy: SubsidyCheck | null;
  /** 이자지원 요건(20%·30%)에 닿는 가장 적은 조치 조합. 닿을 수 없으면 `null`. */
  minimalCombos: { general: MeasureCode[] | null; preferred: MeasureCode[] | null };
  citations: AdvisorCitation[];
  caution: string;
  /** 법령 원문을 받은 시각. 법령 코퍼스가 없으면 `null`. */
  lawAsOf: string | null;
  fallbackReason?: string;
}

/** 공사 규모 — beec `Measure` 의 비용등급과 같은 값. */
export const COST_LEVEL: Record<MeasureCode, 1 | 2 | 3> = {
  WAL: 3,
  WIN: 3,
  HRV: 2,
  BOI: 2,
  ROF: 2,
  LED: 1,
};

/** 2026 민간 그린리모델링 이자지원: 20% 이상 일반 4.5%, 30% 이상 우대 5.5%. */
export const SUBSIDY_GENERAL_PCT = 20;
export const SUBSIDY_PREFERRED_PCT = 30;

const MEASURE_BY_CODE = new Map(REMODEL_MEASURES.map((m) => [m.code as MeasureCode, m]));

export function measureTitle(code: MeasureCode): string {
  return MEASURE_BY_CODE.get(code)?.title ?? code;
}

const isApartment = (useType: string) => /공동주택|아파트/.test(useType);

/**
 * 이 건물·사용자에게 의미 있는 조치만 남긴다.
 *  - 지역난방·중앙난방이면 세대에 보일러가 없으므로 보일러 교체를 뺀다.
 * 그리고 혼자 결정할 수 없는 조치에는 이유를 붙인다.
 *  - 공동주택의 외벽·지붕은 공용부라 단지(입주자대표회의) 합의가 필요하다.
 *  - 임차인은 공사가 필요한 조치를 집주인 동의 없이 할 수 없다.
 */
export function eligibleMeasures(building: AdvisorBuilding, audience: AdvisorAudience) {
  const heating = building.heatingType ?? "";
  const noOwnBoiler = /지역|중앙/.test(heating);
  return REMODEL_MEASURES.filter((m) => !(m.code === "BOI" && noOwnBoiler)).map((m) => {
    const code = m.code as MeasureCode;
    let needs: string | null = null;
    if (isApartment(building.useType) && (code === "WAL" || code === "ROF")) needs = "단지 합의 필요(공용부)";
    else if (audience === "tenant" && code !== "LED") needs = "집주인 동의 필요";
    return { code, title: m.title, reductionPct: m.reductionPct as number, costLevel: COST_LEVEL[code], needs };
  });
}

/** 절감률은 더하지 않고 곱한다: 남는 비율 = Π(1 − r). 더하면 과대추정된다. */
export function combinedReduction(codes: MeasureCode[]): number {
  const remain = codes.reduce((acc, code) => acc * (1 - (MEASURE_BY_CODE.get(code)?.reductionPct ?? 0) / 100), 1);
  return Math.round((1 - remain) * 1000) / 10;
}

export function subsidyCheck(codes: MeasureCode[]): SubsidyCheck | null {
  if (codes.length === 0) return null;
  const reductionPercent = combinedReduction(codes);
  if (reductionPercent >= SUBSIDY_PREFERRED_PCT) {
    return { reductionPercent, tier: "preferred", label: "이자지원 우대(5.5%) 개선률 기준 이상" };
  }
  if (reductionPercent >= SUBSIDY_GENERAL_PCT) {
    return { reductionPercent, tier: "general", label: "이자지원 일반(4.5%) 개선률 기준 이상" };
  }
  return { reductionPercent, tier: "below", label: "이자지원 개선률 기준(20%) 미만" };
}

/**
 * 기준에 닿는 가장 작은 조합. 조치가 6개뿐이라 모든 부분집합(64개)을 본다.
 * 고르는 순서: 혼자 결정할 수 없는 조치(단지 합의·집주인 동의)가 적은 것 →
 * 조치 수가 적은 것 → 공사 규모 합이 작은 것 → 감소율이 큰 것.
 * 아파트 세대라면 외벽보다 창호 조합이 먼저 나오는 이유다.
 */
export function minimalCombos(measures: { code: MeasureCode; needs: string | null }[]): AdvisorResponse["minimalCombos"] {
  type Combo = { set: MeasureCode[]; blocked: number; cost: number; red: number };
  const better = (a: Combo, b: Combo | null) => {
    if (!b) return true;
    if (a.blocked !== b.blocked) return a.blocked < b.blocked;
    if (a.set.length !== b.set.length) return a.set.length < b.set.length;
    if (a.cost !== b.cost) return a.cost < b.cost;
    return a.red > b.red;
  };
  let general: Combo | null = null;
  let preferred: Combo | null = null;

  for (let mask = 1; mask < 1 << measures.length; mask += 1) {
    const picked = measures.filter((_, i) => mask & (1 << i));
    const set = picked.map((m) => m.code);
    const red = combinedReduction(set);
    const cand: Combo = {
      set,
      blocked: picked.filter((m) => m.needs).length,
      cost: set.reduce((sum, c) => sum + COST_LEVEL[c], 0),
      red,
    };
    if (red >= SUBSIDY_GENERAL_PCT && better(cand, general)) general = cand;
    if (red >= SUBSIDY_PREFERRED_PCT && better(cand, preferred)) preferred = cand;
  }
  const g = general as Combo | null;
  const p = preferred as Combo | null;
  return { general: g?.set ?? null, preferred: p?.set ?? null };
}

/** 질문에 나온 생활어로 조치 우선순위를 정한다 — Gemini 가 없을 때의 규칙 기반 답에서 쓴다. */
const QUESTION_HINTS: [RegExp, MeasureCode[]][] = [
  [/창|유리|샷시|섀시|외풍|웃풍|결로/, ["WIN"]],
  [/벽|추워|춥/, ["WAL", "WIN"]],
  [/지붕|옥상|최상층|꼭대기/, ["ROF"]],
  [/보일러|난방비|가스/, ["BOI"]],
  [/환기|공기|답답/, ["HRV"]],
  [/조명|전등|형광등|전기/, ["LED"]],
  [/관리비|요금|비용|절약|아끼|줄이/, ["WIN", "WAL", "BOI", "LED"]],
];

/** 질문이 6가지 개선 조치 중 무엇을 가리키는지. 아무것도 아니면 빈 배열(예: 태양광, 법 정의 질문). */
export function hintedMeasures(question: string, codes: MeasureCode[]): MeasureCode[] {
  const hinted = QUESTION_HINTS.filter(([re]) => re.test(question)).flatMap(([, list]) => list);
  return [...new Set(hinted)].filter((c) => codes.includes(c));
}

export function rankByQuestion(question: string, codes: MeasureCode[]): MeasureCode[] {
  const hinted = QUESTION_HINTS.filter(([re]) => re.test(question)).flatMap(([, list]) => list);
  // 질문에 먼저 걸린 조치가 절감률 차이보다 앞서도록 순위 간격을 크게 둔다.
  const score = (c: MeasureCode) =>
    (hinted.includes(c) ? 1000 - 100 * hinted.indexOf(c) : 0) + (MEASURE_BY_CODE.get(c)?.reductionPct ?? 0);
  return [...codes].sort((a, b) => score(b) - score(a));
}

/** 상담 화면의 예시 질문. 시연 시나리오와 맞춘다. */
export const EXAMPLE_QUESTIONS = [
  "겨울에 창가가 너무 추워요. 무엇부터 하면 좋을까요?",
  "관리비를 줄이려면 어떤 공사가 효과적인가요?",
  "그린리모델링 이자지원을 받을 수 있나요?",
  "그린리모델링은 법적으로 무엇을 말하나요?",
] as const;

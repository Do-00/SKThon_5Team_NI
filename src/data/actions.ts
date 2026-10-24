/**
 * Recommended eco actions for the Eco Check prototype, ordered from the
 * smallest to the largest estimated monthly savings.
 */

export type EcoActionDifficulty = "easy" | "medium" | "hard";

/**
 * Applicant categories that can realistically carry out an action. Mirrors
 * `UserType` in `src/data/account.ts` and `SupportProgramUserType` in
 * `src/data/programs.ts` (kept as separate local unions, rather than a
 * shared import, so these fixture modules stay independent of each other).
 */
export type EcoActionUserType = "owner" | "tenant" | "hoa" | "corporation" | "general";

export interface CostRangeManwon {
  /** Lower bound of the estimated one-time implementation cost, in 만원 (10,000 KRW) units. */
  min: number;
  /** Upper bound of the estimated one-time implementation cost, in 만원 units. */
  max: number;
}

export interface EcoAction {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: EcoActionDifficulty;
  /** Estimated monthly savings in 만원 (10,000 KRW) units. */
  monthlySavingsManwon: number;
  /** Estimated one-time cost to implement this action. */
  estimatedCostRangeManwon: CostRangeManwon;
  /** Applicant categories who can realistically carry out this action. */
  eligibleUserTypes: EcoActionUserType[];
  /** Whether at least one public support program (see `src/data/programs.ts`) can offset this action's cost. */
  supportEligible: boolean;
  /** IDs of matching programs from `src/data/programs.ts`. Empty when `supportEligible` is `false`. */
  supportProgramIds: string[];
  /**
   * beec's `/api/simulate` measure code (see `beec/.../Measure.java`).
   * Every current action maps to one of beec's 6 real measures; `undefined`
   * is only for a future action that doesn't (the What-if simulator skips
   * those when calling the real API).
   */
  measureCode?: string;
}

const ECO_ACTIONS: readonly EcoAction[] = [
  {
    id: "act-001",
    title: "LED 조명 전환",
    description: "공용부와 세대 내 조명을 고효율 LED로 교체해 전력 사용량을 줄입니다.",
    category: "조명",
    difficulty: "easy",
    monthlySavingsManwon: 4,
    estimatedCostRangeManwon: { min: 30, max: 80 },
    eligibleUserTypes: ["owner", "tenant", "hoa", "general"],
    supportEligible: true,
    supportProgramIds: ["prog-005"],
    measureCode: "LED",
  },
  {
    // beec Measure.java 의 "지붕·최상층 단열" 그대로.
    id: "act-006",
    title: "지붕·최상층 단열",
    description: "최상층 천장과 지붕 단열을 보강합니다.",
    category: "단열",
    difficulty: "medium",
    monthlySavingsManwon: 6,
    estimatedCostRangeManwon: { min: 100, max: 250 },
    eligibleUserTypes: ["owner", "hoa"],
    supportEligible: true,
    supportProgramIds: ["prog-001", "prog-003"],
    measureCode: "ROF",
  },
  {
    // beec 쪽 이름은 "고효율 보일러 교체"(medium, WAL·WIN과 같은 곱셈 계산에 들어감) —
    // "설정 최적화" 같은 무상 조치가 아니라 실제 교체 공사라 난이도·비용도 그에 맞췄다.
    id: "act-002",
    title: "고효율 보일러 교체",
    description: "노후 보일러를 고효율(콘덴싱 등) 제품으로 교체합니다.",
    category: "난방",
    difficulty: "medium",
    monthlySavingsManwon: 7,
    estimatedCostRangeManwon: { min: 80, max: 150 },
    eligibleUserTypes: ["owner", "tenant", "hoa"],
    supportEligible: false,
    supportProgramIds: [],
    measureCode: "BOI",
  },
  {
    // beec Measure.java 의 "열회수 환기장치" 그대로.
    id: "act-007",
    title: "열회수 환기장치",
    description: "환기로 빠져나가는 열을 회수해 난방 부하를 줄입니다.",
    category: "설비",
    difficulty: "medium",
    monthlySavingsManwon: 8,
    estimatedCostRangeManwon: { min: 150, max: 300 },
    eligibleUserTypes: ["owner", "hoa", "corporation"],
    supportEligible: true,
    supportProgramIds: ["prog-005"],
    measureCode: "HRV",
  },
  {
    // beec 쪽 이름은 "고성능 창호 교체"(hard, 열손실이 가장 큰 부위) —
    // 필름 시공 같은 경량 보강이 아니라 전체 교체라 난이도·비용도 그에 맞췄다.
    id: "act-003",
    title: "고성능 창호 교체",
    description: "노후 창호를 고단열 창호로 전체 교체해 열손실을 줄입니다.",
    category: "단열",
    difficulty: "hard",
    monthlySavingsManwon: 9,
    estimatedCostRangeManwon: { min: 300, max: 600 },
    eligibleUserTypes: ["owner", "hoa"],
    supportEligible: true,
    supportProgramIds: ["prog-001", "prog-003"],
    measureCode: "WIN",
  },
  {
    id: "act-005",
    title: "외벽 단열 보강",
    description: "외벽 단열재를 보강해 냉난방 부하를 크게 낮춥니다.",
    category: "단열",
    difficulty: "hard",
    monthlySavingsManwon: 51,
    estimatedCostRangeManwon: { min: 3000, max: 8000 },
    eligibleUserTypes: ["owner", "hoa", "corporation"],
    supportEligible: true,
    supportProgramIds: ["prog-001", "prog-003", "prog-006"],
    measureCode: "WAL",
  },
];

/** Returns every recommended eco action, ordered by ascending savings. */
export async function getEcoActions(): Promise<EcoAction[]> {
  return [...ECO_ACTIONS];
}

/** Returns a single eco action by id, if it exists. */
export async function getEcoActionById(id: string): Promise<EcoAction | undefined> {
  return ECO_ACTIONS.find((action) => action.id === id);
}

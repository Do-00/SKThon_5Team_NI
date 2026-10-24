import { GRADE_ORDER, type GradeCode } from "../data/grades";
import { API_BASE_URL } from "./api-base-url";

/**
 * Client for the real `beec` Spring Boot backend (see `/beec` at the repo
 * root — run it with `./mvnw spring-boot:run`, defaults to port 8080).
 *
 * `matchAddress`/`estimateReport` run server-side only (Server Components,
 * route handlers). They use `NEXT_PUBLIC_API_BASE_URL` like the browser-side
 * calls in `eco-api.ts`, unless the server-only `BEEC_API_BASE_URL` overrides
 * it. The constants and `toGradeCode` below have no Node dependencies and are
 * safe to import from Client Components too.
 */

const BEEC_API_BASE_URL = process.env.BEEC_API_BASE_URL ?? API_BASE_URL;

export interface MatchResult {
  found: boolean;
  /** Building/site name, e.g. `"서울시 서초동1692-6 업무시설"`. Present only when `found`. */
  name?: string;
  /**
   * 현행 기준표(`GradeTable.java`)로 `energyValue` 에서 계산한 등급 라벨,
   * e.g. `"1+등급"`. `/api/simulate` 의 `gradeBefore` 와 같은 기준입니다.
   * 에너지 값이 없는 기록이면 `null`.
   */
  grade?: string | null;
  /** `grade` without the suffix, e.g. `"1+"`. `null` when `grade` is null. */
  gradeCode?: string | null;
  /**
   * 인증서에 실제로 적혀 있는 등급. 인증서는 발급 당시 고시 기준이라
   * `grade` 와 다를 수 있습니다. 화면에는 "인증서 기준" 으로 따로 적어 주세요.
   */
  certGrade?: string | null;
  /** `certGrade` without the `"등급"` suffix. */
  certGradeCode?: string | null;
  /** Annual primary energy consumption, kWh/m²·yr. `null` when the record has none. */
  energyValue?: number | null;
  /** Same value as `energyValue`, named for the what-if simulator's `baseEnergy`. */
  primaryEnergyKwh?: number | null;
  /** `"주거용"` or `"주거용 이외"`. Present only when `found`. */
  purpose?: string;
  region?: string;
  /** 시군구, e.g. `"마포구"`. */
  district?: string;
  /** `"본인증"`, `"예비인증"`, or empty when the record has no certification. */
  certKind?: string;
}

export interface ReportEstimate {
  found: boolean;
  message?: string;
  sampleCount?: number;
  /** Grade label with the `"등급"` suffix, e.g. `"1+등급"`. Present only when `found`. */
  estimatedGrade?: string;
  gradeDistribution?: Record<string, number>;
  lowSample?: boolean;
  /** `estimatedGrade` without the suffix. */
  gradeCode?: string;
  /** 그룹(용도·지역·규모) 인증값의 중앙값, kWh/m²·yr — 시뮬레이터의 `baseEnergy`. */
  primaryEnergyKwh?: number | null;
  /** 보정 전 그룹 대표값 (= `primaryEnergyKwh`). */
  baseEnergyKwh?: number | null;
  /** 사용자 입력(준공연도·난방·창호)으로 보정한 값. 입력이 없으면 `baseEnergyKwh`와 같다. */
  adjustedEnergyKwh?: number | null;
  scopeLabel?: string;
  confidence?: ApartmentConfidence;
}

/** Building size bucket `/api/report` groups by — matches the Java backend's `sizeBucket` values. */
export type SizeBucket = "small" | "medium" | "large" | "xlarge";

/**
 * `/api/report` accepts a fifth bucket, `"unknown"`, for records with no
 * recorded size — but that's a fallback for missing data, not something a
 * user picks, so it's deliberately left out of this user-facing list.
 */
export const SIZE_BUCKET_OPTIONS: readonly { value: SizeBucket; label: string }[] = [
  { value: "small", label: "소형" },
  { value: "medium", label: "중형" },
  { value: "large", label: "대형" },
  { value: "xlarge", label: "초대형" },
];

/** `/api/report`'s `purpose` values — send `"주거용 이외"` for non-residential (the server also accepts `"비주거용"` and converts it). */
export const PURPOSE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "주거용", label: "주거용" },
  { value: "주거용 이외", label: "주거용 이외" },
];

/** `/api/report`'s `region` values — every region beec's seed data groups by. */
export const REGION_OPTIONS: readonly string[] = [
  "서울",
  "경기",
  "인천",
  "강원",
  "대전",
  "세종",
  "충남",
  "충북",
  "광주",
  "전남",
  "전북",
  "대구",
  "경북",
  "부산",
  "울산",
  "경남",
  "제주",
];

/** beec grade labels carry a `"등급"` suffix (`"1+등급"`); `GradeCode` doesn't. */
export function toGradeCode(label: string | null | undefined): GradeCode | null {
  return GRADE_ORDER.find((code) => `${code}등급` === label) ?? null;
}

async function beecGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(path, BEEC_API_BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`beec ${path} error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Looks up a building by address against beec's 동+번지 실측 데이터 (`/api/match`).
 * `buildingName` narrows lots with several buildings, same as the home page's browser-side call.
 */
export async function matchAddress(address: string, buildingName?: string): Promise<MatchResult> {
  return beecGet<MatchResult>("/api/match", {
    roadAddress: address,
    ...(buildingName ? { buildingName } : {}),
  });
}

/** Estimates a grade from 용도/지역/규모 alone, for addresses `matchAddress` can't find (`/api/report`). */
export async function estimateReport(
  purpose: string,
  region: string,
  sizeBucket: SizeBucket,
): Promise<ReportEstimate> {
  return beecGet<ReportEstimate>("/api/report", { purpose, region, sizeBucket });
}

export interface SimulateStep {
  code: string;
  title: string;
  reductionPct: number;
  from: number;
  to: number;
}

export interface SimulateResult {
  found: boolean;
  message?: string;
  purpose?: string;
  baseEnergy?: number;
  energy?: number;
  unit?: string;
  savedEnergy?: number;
  savedPct?: number;
  /** Grade code without the `"등급"` suffix (unlike `MatchResult`/`ReportEstimate`) — matches `GradeCode` directly. */
  gradeCodeBefore?: string;
  gradeBefore?: string;
  gradeCode?: string;
  grade?: string;
  gradeUp?: number;
  applied?: string[];
  steps?: SimulateStep[];
}

/**
 * What-if 시뮬레이터 (`/api/simulate`): applies `measureCodes` (beec's 6
 * improvement measures — see `Measure.java`, e.g. `"WIN"`, `"WAL"`) to
 * `baseEnergy` multiplicatively and returns the resulting grade/energy.
 */
export async function simulateWhatIf(
  baseEnergy: number,
  measureCodes: string[],
  purpose: string,
): Promise<SimulateResult> {
  return beecGet<SimulateResult>("/api/simulate", {
    baseEnergy: String(baseEnergy),
    measures: measureCodes.join(","),
    purpose,
  });
}

/**
 * 서울 아파트 API (`ApartmentController.java`) — `seed.json`(`/api/match`)과는
 * 완전히 별개인 서울시 공동주택(K-apt) 데이터셋. 아파트명/도로명으로 찾고,
 * 인증 실적이 있으면 실측값을, 없으면 또래 기반 추정(신뢰도 게이트를 통과할
 * 때만)을 돌려준다. 등급 코드는 `GradeTable.codeOf()`가 낸 값이라 `"등급"`
 * 접미사가 없다 — `MatchResult.grade`와 달리 `toGradeCode()` 변환이 필요 없다.
 */
export interface ApartmentSearchItem {
  aptCode: string;
  name: string;
  address: string;
  sgg: string;
  emd: string;
  completionYear: number | null;
  insulationEra: string | null;
  households: number | null;
  certified: boolean;
}

export interface ApartmentSearchResult {
  query: string;
  total: number;
  count: number;
  truncated: boolean;
  items: ApartmentSearchItem[];
}

/** `/api/apt/search` — 아파트명·주소 부분 일치. `limit` 최대 500(서버 쪽 캡), 여긴 목록용으로 작게 쓴다. */
export async function searchApartments(q: string, limit = 5): Promise<ApartmentSearchResult> {
  return beecGet<ApartmentSearchResult>("/api/apt/search", { q, limit: String(limit) });
}

export interface ApartmentFacts {
  sgg: string;
  emd: string;
  completionYear: number | null;
  insulationEra: string | null;
  households: number | null;
  dongCount: number | null;
  corridorType: string | null;
  heatingType: string | null;
  grossFloorArea: number | null;
  builder: string | null;
  complexType: string | null;
  source: string;
}

/** 인증 실적이 있는 단지의 실측값 — 추정이 아니다. */
export interface ApartmentMeasured {
  energyValue: number;
  /** `"2등급"`처럼 접미사 포함. */
  grade: string;
  /** 접미사 없는 코드 — `GradeCode`에 바로 대입 가능. */
  gradeCode: string;
  certCount: number;
  matchedBy: string | null;
  labelSource: string | null;
  precise: boolean;
  source: string;
}

/** 이 단지의 단열기준 시기에 대해 모델을 믿어도 되는지 — `ModelService.Gate`를 화면용으로 풀어 쓴 묶음. */
export interface ApartmentModelGate {
  policy: "point" | "range" | "refuse";
  /** 교차검증 표본 수. */
  validationSamples?: number;
  /** 교차검증 평균 절대오차, kWh/m²·yr. */
  mae?: number | null;
  reason: string;
  basis?: string;
}

/** 같은 조건 또래 단지 — 모델이 무엇을 보고 판단했는지 사람이 납득하는 보조 근거. */
export interface ApartmentPeers {
  level: string;
  label: string;
  count: number;
  median: number;
  iqr: number;
}

export interface ApartmentBuilderInfo {
  name: string | null;
  certifiedComplexes: number;
  effect: string;
}

/** 준공연도로 정해지는 적용 단열기준과, 같은 시기 서울 아파트의 인증 비율. */
export interface ApartmentInsulationEra {
  name: string;
  basis: string;
  seoulTotal: number;
  seoulCertified: number;
  certifiedPct: number;
  note: string;
}

/** `Confidence.java` — 표본 수·분포 집중도·입력 충실도로 매긴 추정 신뢰도. */
export interface ApartmentConfidence {
  score: number;
  /** `"높음"` / `"보통"` / `"낮음"`. */
  level: string;
  sampleCount: number;
  topGradeShare: number;
  userInputs: number;
  maxUserInputs: number;
  reasons: string[];
  disclaimer: string;
}

/** 또래 기반 추정 — 신뢰도 게이트(`ModelService`)를 통과했을 때만 채워진다. */
export interface ApartmentEstimate {
  /** `"point"`면 등급 하나로 말해도 됨, `"range"`면 범위로만. */
  policy: "point" | "range";
  energyPredicted: number;
  energyLow: number;
  energyHigh: number;
  marginOfError: number;
  /** 접미사 없는 코드. */
  gradeBest: string;
  gradeWorst: string;
  /** `policy === "point"`일 때만 값이 있음. */
  grade: string | null;
  presentation: string;
  disclaimer: string;
  model?: ApartmentModelGate;
  modelMethod?: string | null;
  modelFeatures?: string[];
  peers?: ApartmentPeers;
  builder?: ApartmentBuilderInfo;
}

export interface ApartmentDetail {
  found: boolean;
  aptCode?: string;
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  facts?: ApartmentFacts;
  insulationEra?: ApartmentInsulationEra;
  /** 인증 실적이 없으면 `null`. */
  measured?: ApartmentMeasured | null;
  /** 신뢰도 게이트를 통과 못 했으면 `null` — `estimateSkipped`에 이유가 담긴다. */
  estimate?: ApartmentEstimate | null;
  estimateSkipped?: string;
  /** 추정을 냈을 때만 — 또래 표본으로 계산한 신뢰도. */
  confidence?: ApartmentConfidence;
  /** 추정을 거절했을 때만 — 거절한 시기의 검증 결과. */
  modelGate?: ApartmentModelGate;
  /** 추정을 거절했을 때 대신 보여줄 문장들. */
  whatWeCanSay?: { points: string[]; nextStep: string };
}

/** `/api/apt/{aptCode}` — facts(확실)/measured(실측)/estimate(추정, null일 수 있음) 세 덩어리를 절대 섞지 않고 돌려준다. */
export async function getApartmentDetail(aptCode: string): Promise<ApartmentDetail> {
  return beecGet<ApartmentDetail>(`/api/apt/${encodeURIComponent(aptCode)}`, {});
}

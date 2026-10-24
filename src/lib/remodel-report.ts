import { GRADE_ORDER, GRADES, PRIMARY_ENERGY_UNIT, type GradeCode } from "../data/grades";
import type { BuildingRawSource } from "../data/buildings";
import { EXAMPLE_ENERGY_COST, getExampleEnergyCost } from "../data/energy-cost";
import { HEATING_TYPE_OPTIONS, type ApartmentChecklistAnswers } from "./apartment-checklist";
import type { EnergyMetrics } from "./eco-api";
import { formatNumber } from "./format";
import { gradeFromPrimaryEnergy, shiftGrade } from "./what-if";

/**
 * Gemini 리모델링 리포트 — 프롬프트·참고 계산·검증·폴백.
 *
 * 개선 후 등급과 연간 절감 고정비는 Gemini가 예측한다. 다만 근거 없는 숫자가
 * 나오지 않도록 beec `Measure.java`의 부위별 절감률로 먼저 계산한 **참고값**을
 * 같이 넘기고, 돌아온 예측이 그 범위를 크게 벗어나면 받지 않고 참고값으로 쓴
 * 규칙 기반 리포트로 대신한다.
 *
 * 현재 1차에너지소요량이 없는 건물(beec 모델이 추정을 거절한 단지)은 Gemini가
 * 건물 데이터로 현재 소요량부터 추정하고(`currentBasis: "ai"`), 그 값을 기준으로
 * 같은 절감률을 적용한다. 통계 추정 건물은 추정 등급 구간의 중간값을 쓴다.
 *
 * 라우트(서버)와 컴포넌트(네트워크 실패 시 폴백) 양쪽에서 쓰므로 서버 전용 코드는 넣지 않는다.
 */

/** beec `Measure.java`의 개선 항목 6가지와 1차에너지 절감률(%) — 이름·순서·값을 그대로 옮겼다. */
export const REMODEL_MEASURES = [
  { code: "WAL", title: "외벽 단열 보강", reductionPct: 18, source: "열손실의 20~30%가 외벽 (국토부·정책브리핑)" },
  { code: "WIN", title: "고성능 창호 교체", reductionPct: 15, source: "외피 개선 문헌값" },
  { code: "HRV", title: "열회수 환기장치", reductionPct: 10, source: "설비 개선 문헌값" },
  { code: "BOI", title: "고효율 보일러 교체", reductionPct: 9, source: "설비 개선 문헌값" },
  { code: "ROF", title: "지붕·최상층 단열", reductionPct: 8, source: "외피 개선 문헌값" },
  { code: "LED", title: "LED 조명 전환", reductionPct: 4, source: "형광램프 대비 40% 절감 × 조명 비중 약 10%" },
] as const;

/** 6가지를 곱으로 누적했을 때 남는 비율. */
const REMODEL_FACTOR = REMODEL_MEASURES.reduce((acc, measure) => acc * (1 - measure.reductionPct / 100), 1);

export const REPORT_MIN_LINES = 10;
export const REPORT_MAX_LINES = 13;

/** Gemini가 현재 소요량을 추정할 때 받아들이는 범위, kWh/m²·yr — 서울 아파트 인증값이 걸치는 폭. */
const AI_ESTIMATE_MIN_KWH = 60;
const AI_ESTIMATE_MAX_KWH = 450;

export interface RemodelReportInput {
  buildingId: string;
  buildingName: string;
  address: string;
  useType: string;
  grade: GradeCode;
  isEstimated: boolean;
  /** `0`이면 소요량을 모르는 건물(추정 보류·통계 추정). */
  primaryEnergyKwh: number;
  /** beec 원본 응답. fixture 건물이면 `null`. */
  rawSource: BuildingRawSource | null;
  /** 주소 검색 후 사용자가 입력한 집 정보. 입력하지 않았으면 `null`. */
  checklist: ApartmentChecklistAnswers | null;
  metrics: EnergyMetrics | null;
}

/**
 * 현재 1차에너지소요량이 어디서 왔는지.
 * - `data`: 인증 실측값이나 beec 모델 추정값
 * - `band`: 통계 추정 등급 구간의 중간값
 * - `ai`: 데이터가 없어 Gemini가 건물 정보로 추정한 값
 * - `unknown`: 아직 없음 (Gemini가 추정하기 전)
 */
export type CurrentBasis = "data" | "band" | "ai" | "unknown";

export interface RemodelReportData {
  currentGrade: GradeCode;
  currentPrimaryEnergyKwh: number | null;
  currentBasis: CurrentBasis;
  /** 소요량을 모르면 `null`. */
  projectedGrade: GradeCode | null;
  projectedPrimaryEnergyKwh: number | null;
  /** 6가지를 모두 적용했을 때 1차에너지소요량 감소율(%). */
  reductionPercent: number;
  /** 연간 난방비(고정비), 만원. */
  annualEnergyCostManwon: number | null;
  /** 연간 절감 고정비, 만원. */
  annualSavingsManwon: number | null;
}

export interface RemodelReportResult {
  data: RemodelReportData;
  /** 보고서 본문 — 한 요소가 한 줄. */
  report: string[];
  source: "gemini" | "fallback";
  /** 폴백일 때 Gemini를 쓰지 못한 이유 — 브라우저 네트워크 탭에서 바로 확인하려고 둔다. 키 값은 담지 않는다. */
  fallbackReason?: string;
}

/** 참고 계산값 — Gemini 예측의 기준이자 폴백 수치. */
export interface RemodelReference extends RemodelReportData {
  /** beec `/api/simulate`로 계산했는지, 같은 절감률로 여기서 계산했는지. */
  basis: "beec" | "local";
}

/** 계산의 출발점이 되는 현재 상태. */
export interface CurrentState {
  energy: number | null;
  grade: GradeCode;
  basis: CurrentBasis;
  annualCostManwon: number | null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** 등급 구간의 중간값. 7등급은 상한이 없어 하한 + 30. */
function bandMidpoint(grade: GradeCode): number {
  const { minPrimaryEnergyKwh: min, maxPrimaryEnergyKwh: max } = GRADES[grade];
  return max === null ? min + 30 : Math.round((min + max) / 2);
}

/** 화면이 가진 값으로 정한 현재 상태. 소요량이 없으면 통계 추정 등급 구간 중간값, 그것도 없으면 `unknown`. */
export function currentStateOf(input: RemodelReportInput): CurrentState {
  if (input.primaryEnergyKwh > 0) {
    return {
      energy: input.primaryEnergyKwh,
      grade: input.grade,
      basis: "data",
      annualCostManwon: input.metrics?.annualEnergyCostManwon ?? null,
    };
  }
  if (input.rawSource?.kind === "report") {
    return {
      energy: bandMidpoint(input.grade),
      grade: input.grade,
      basis: "band",
      annualCostManwon: getExampleEnergyCost(input.grade).annualEnergyCostManwon,
    };
  }
  // 추정 보류 단지의 `grade`는 화면용 자리값이라 계산에 쓰지 않는다.
  return { energy: null, grade: input.grade, basis: "unknown", annualCostManwon: null };
}

/** Gemini가 추정한 현재 소요량으로 만든 현재 상태 — 등급은 기준표, 난방비는 등급별 예시표에서. */
export function aiCurrentState(energy: number): CurrentState {
  const grade = gradeFromPrimaryEnergy(energy);
  return { energy, grade, basis: "ai", annualCostManwon: getExampleEnergyCost(grade).annualEnergyCostManwon };
}

/** 감소율·개선 후 값에 현재 값과 연간 절감 고정비를 붙인다 — beec 결과와 로컬 계산이 같은 모양이 되도록. */
export function completeReference(
  current: CurrentState,
  part: Pick<RemodelReference, "reductionPercent" | "projectedPrimaryEnergyKwh" | "projectedGrade" | "basis">,
): RemodelReference {
  const reductionPercent = Math.round(part.reductionPercent);
  const cost = current.annualCostManwon;
  return {
    ...part,
    reductionPercent,
    currentGrade: current.grade,
    currentPrimaryEnergyKwh: current.energy,
    currentBasis: current.basis,
    annualEnergyCostManwon: cost,
    annualSavingsManwon: current.energy !== null && cost !== null ? Math.round((cost * reductionPercent) / 100) : null,
  };
}

/** beec 없이 같은 절감률(곱으로 누적)로 계산한 참고값. */
export function computeLocalReference(current: CurrentState): RemodelReference {
  const energy = current.energy;
  const projected = energy === null ? null : round1(energy * REMODEL_FACTOR);
  return completeReference(current, {
    reductionPercent: (1 - REMODEL_FACTOR) * 100,
    projectedPrimaryEnergyKwh: projected,
    projectedGrade:
      energy === null || projected === null
        ? null
        : shiftGrade(current.grade, gradeFromPrimaryEnergy(energy), gradeFromPrimaryEnergy(projected)),
    basis: "local",
  });
}

function heatingLabel(input: RemodelReportInput): string | null {
  const picked = HEATING_TYPE_OPTIONS.find((option) => option.value === input.checklist?.heatingType);
  if (picked) return picked.label;
  return input.rawSource?.kind === "apt" ? (input.rawSource.data.facts?.heatingType ?? null) : null;
}

function checklistLines(checklist: ApartmentChecklistAnswers | null): string[] {
  if (!checklist) return ["- 없음"];
  const lines: string[] = [];
  if (checklist.completionYear !== null) lines.push(`- 준공연도: ${checklist.completionYear}년`);
  if (checklist.builder) lines.push(`- 건설사: ${checklist.builder}`);
  const heating = HEATING_TYPE_OPTIONS.find((option) => option.value === checklist.heatingType);
  if (heating) lines.push(`- 난방방식: ${heating.label}`);
  return lines.length > 0 ? lines : ["- 없음"];
}

/** fixture 건물은 원본 응답이 없으니 화면에 쓰는 값만 넘긴다. */
function buildingData(input: RemodelReportInput): unknown {
  return (
    input.rawSource?.data ?? {
      name: input.buildingName,
      address: input.address,
      useType: input.useType,
      grade: input.grade,
      primaryEnergyKwh: input.primaryEnergyKwh,
    }
  );
}

function currentValueLine(reference: RemodelReference): string {
  const energy = reference.currentPrimaryEnergyKwh;
  const label = GRADES[reference.currentGrade].label;
  if (reference.currentBasis === "band" && energy !== null) {
    return `- 현재 등급: ${label} (통계 추정), 1차에너지소요량 ${energy} ${PRIMARY_ENERGY_UNIT} (이 등급 구간의 중간값)`;
  }
  if (energy !== null) return `- 현재 등급: ${label}, 1차에너지소요량 ${energy} ${PRIMARY_ENERGY_UNIT}`;
  return "- 현재 1차에너지소요량: 인증값도 모델 추정값도 없음 (beec 모델이 오차가 커서 추정을 보류함)";
}

export function buildRemodelReportPrompt(input: RemodelReportInput, reference: RemodelReference): string {
  const unknown = reference.currentBasis === "unknown";
  const lines: (string | null)[] = [
    "당신은 건물 그린리모델링 컨설턴트입니다.",
    "아래 [건물 데이터]와 [사용자 입력 정보]를 근거로, 추천 리모델링 6가지를 모두 적용했을 때",
    "이 건물의 1차에너지소요량·에너지효율등급·연간 절감 고정비를 예측하고, 일반인이 읽을 보고서를 작성하세요.",
    "",
    "[규칙]",
    '- JSON 하나만 출력합니다. 형식: {"data": {...}, "report": ["문장", ...]}',
    `- report는 ${REPORT_MIN_LINES}~${REPORT_MAX_LINES}개 문장의 배열입니다. 한 요소가 보고서 한 줄이며 한국어 존댓말로 씁니다.`,
    "- 어떤 리모델링을 하면 1차 에너지효율을 높일 수 있는지 효과가 큰 순서로 설명하고, 절감 효과를 긍정적으로 검토합니다.",
    "- 1차에너지소요량(kWh/m²·yr), 등급, 절감률(%), 금액(만원) 숫자를 적극적으로 인용하고, 전문용어는 쉽게 풀어 씁니다.",
    "- 아래에 주어진 숫자와 data에 적은 예측값만 인용합니다. 새로운 통계나 출처를 지어내지 마세요.",
    "- 숫자는 반드시 아라비아 숫자와 단위로 씁니다(예: 18%, 198.7 kWh/m²·yr, 53만원, 2005년). 숫자를 한글로 풀어 쓰지 마세요.",
    "- 각 문장은 마침표로 끝냅니다. 마크다운, 번호, 따옴표, 이모지를 쓰지 않습니다. 마지막 줄은 실천을 권하는 문장으로 끝냅니다.",
    "- projectedGrade는 1+++, 1++, 1+, 1, 2, 3, 4, 5, 6, 7 중 하나이며 현재 등급보다 나빠질 수 없습니다.",
    ...(unknown
      ? [
          "- 이 건물은 현재 1차에너지소요량이 없습니다. 먼저 [건물 데이터]의 준공연도·적용 단열기준·난방방식·세대수·연면적·동수·복도유형과",
          "  [사용자 입력 정보]를 하나씩 충분히 따져 보고, 같은 시기·같은 난방방식 서울 아파트라면 어느 정도일지 추론해",
          `  estimatedCurrentPrimaryEnergyKwh에 ${AI_ESTIMATE_MIN_KWH}~${AI_ESTIMATE_MAX_KWH} 사이의 숫자로 적습니다.`,
          "- 그 값에 [참고 계산값]의 감소율을 적용해 projectedPrimaryEnergyKwh를 정하고, [등급 기준표]로 현재·개선 후 등급을,",
          "  [등급별 연간 난방비 예시]의 현재 등급 금액 × 감소율로 annualSavingsManwon을 정합니다.",
          "- 보고서 앞부분에서 현재 소요량은 인증 자료가 없어 건물 정보로 추정한 값이라는 점을 한 번 밝힙니다.",
        ]
      : [
          "- estimatedCurrentPrimaryEnergyKwh는 null로 둡니다.",
          "- data의 예측값은 [참고 계산값]을 기준으로 건물 특성(준공연도·단열기준·난방방식·사용자 입력)을 반영해 ±15% 안에서 정합니다.",
        ]),
    "",
    "[현재 값]",
    `- 건물명: ${input.buildingName}`,
    `- 주소: ${input.address}`,
    `- 용도: ${input.useType}`,
    `- 등급 산정 방식: ${input.isEstimated ? "공공데이터 기반 추정 등급" : "한국에너지공단 인증 등급"}`,
    currentValueLine(reference),
    reference.annualEnergyCostManwon !== null
      ? `- 연간 난방비(고정비): 약 ${reference.annualEnergyCostManwon}만원`
      : unknown
        ? "- 연간 난방비: 추정한 현재 등급으로 [등급별 연간 난방비 예시]에서 찾습니다."
        : "- 연간 난방비: 정보 없음 (금액을 언급하지 마세요)",
    "",
    "[추천 리모델링 6가지 — 항목별 1차에너지 절감률]",
    ...REMODEL_MEASURES.map((measure) => `- ${measure.title}: ${measure.reductionPct}% (${measure.source})`),
    "",
    "[참고 계산값 — 6가지를 모두 적용, 절감률은 곱으로 누적]",
    `- 1차에너지소요량 감소율: ${reference.reductionPercent}%`,
    reference.projectedPrimaryEnergyKwh !== null && reference.projectedGrade
      ? `- 개선 후 1차에너지소요량: ${reference.projectedPrimaryEnergyKwh} ${PRIMARY_ENERGY_UNIT}, 예상 등급 ${GRADES[reference.projectedGrade].label}`
      : null,
    reference.annualSavingsManwon !== null ? `- 연간 절감 고정비: 약 ${reference.annualSavingsManwon}만원` : null,
    ...(unknown
      ? [
          "",
          `[등급 기준표 — 1차에너지소요량(${PRIMARY_ENERGY_UNIT})]`,
          ...GRADE_ORDER.map((code) => {
            const { label, minPrimaryEnergyKwh: min, maxPrimaryEnergyKwh: max } = GRADES[code];
            return `- ${label}: ${min} 이상${max === null ? "" : ` ${max} 미만`}`;
          }),
          "",
          "[등급별 연간 난방비 예시(만원)]",
          ...GRADE_ORDER.map((code) => `- ${GRADES[code].label}: ${EXAMPLE_ENERGY_COST[code]?.annualEnergyCostManwon}`),
        ]
      : []),
    "",
    "[사용자 입력 정보]",
    ...checklistLines(input.checklist),
    "",
    "[건물 데이터(JSON)]",
    JSON.stringify(buildingData(input)),
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}

/** Gemini `responseSchema` — `{ data, report }`를 한 번에 JSON으로 받는다. */
export const REMODEL_REPORT_SCHEMA = {
  type: "OBJECT",
  properties: {
    data: {
      type: "OBJECT",
      properties: {
        estimatedCurrentPrimaryEnergyKwh: { type: "NUMBER", nullable: true },
        projectedGrade: { type: "STRING", nullable: true },
        projectedPrimaryEnergyKwh: { type: "NUMBER", nullable: true },
        reductionPercent: { type: "NUMBER" },
        annualSavingsManwon: { type: "NUMBER", nullable: true },
      },
      required: [
        "estimatedCurrentPrimaryEnergyKwh",
        "projectedGrade",
        "projectedPrimaryEnergyKwh",
        "reductionPercent",
        "annualSavingsManwon",
      ],
    },
    report: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["data", "report"],
} as const;

function isWithin(value: number, target: number, tolerance: number): boolean {
  return Math.abs(value - target) <= Math.abs(target) * tolerance;
}

function toGrade(value: unknown): GradeCode | null {
  if (typeof value !== "string") return null;
  const code = value.replace(/등급$/, "").trim();
  return (GRADE_ORDER as readonly string[]).includes(code) ? (code as GradeCode) : null;
}

export type GeminiRemodelVerdict = { result: RemodelReportResult } | { reason: string };

/**
 * Gemini가 돌려준 JSON을 검증한다. 참고값에서 크게 벗어나거나(감소율·소요량 ±20%,
 * 절감액 ±30%, 등급 한 칸 초과), 등급이 나빠지거나, 보고서가 너무 짧으면 `{ reason }` —
 * 호출한 쪽은 사유를 로그에 남기고 폴백 리포트를 쓴다.
 *
 * 현재 소요량이 없던 건물은 Gemini가 추정한 현재 소요량(60~450)으로 참고값을 다시
 * 계산한 뒤 같은 기준으로 검증한다.
 */
export function acceptGeminiRemodelReport(raw: unknown, reference: RemodelReference): GeminiRemodelVerdict {
  if (!raw || typeof raw !== "object") return { reason: "JSON 객체가 아님" };
  const { data, report } = raw as { data?: Record<string, unknown>; report?: unknown };
  if (!data || !Array.isArray(report)) return { reason: "data 또는 report 누락" };

  const lines = report
    .filter((line): line is string => typeof line === "string")
    .map((line) => line.trim())
    .filter(Boolean)
    // 문장 끝 마침표를 빼먹는 경우가 있어 맞춰 준다.
    .map((line) => (/[.!?。]$/.test(line) ? line : `${line}.`));
  if (lines.length < REPORT_MIN_LINES) return { reason: `보고서 ${lines.length}줄 (최소 ${REPORT_MIN_LINES}줄)` };

  let ref = reference;
  if (reference.currentBasis === "unknown") {
    const estimated = Number(data.estimatedCurrentPrimaryEnergyKwh);
    if (!Number.isFinite(estimated) || estimated < AI_ESTIMATE_MIN_KWH || estimated > AI_ESTIMATE_MAX_KWH) {
      return {
        reason: `현재 소요량 추정 ${data.estimatedCurrentPrimaryEnergyKwh} (${AI_ESTIMATE_MIN_KWH}~${AI_ESTIMATE_MAX_KWH} 범위 밖)`,
      };
    }
    ref = computeLocalReference(aiCurrentState(round1(estimated)));
  }

  const reductionPercent = Number(data.reductionPercent);
  if (!Number.isFinite(reductionPercent) || !isWithin(reductionPercent, ref.reductionPercent, 0.2)) {
    return { reason: `감소율 ${data.reductionPercent} (참고 ${ref.reductionPercent}% ±20%)` };
  }

  let projectedPrimaryEnergyKwh: number | null = null;
  let projectedGrade: GradeCode | null = null;
  if (ref.currentPrimaryEnergyKwh !== null && ref.projectedPrimaryEnergyKwh !== null && ref.projectedGrade !== null) {
    const energy = Number(data.projectedPrimaryEnergyKwh);
    if (
      !Number.isFinite(energy) ||
      energy >= ref.currentPrimaryEnergyKwh ||
      !isWithin(energy, ref.projectedPrimaryEnergyKwh, 0.2)
    ) {
      return { reason: `개선 후 소요량 ${data.projectedPrimaryEnergyKwh} (참고 ${ref.projectedPrimaryEnergyKwh} ±20%)` };
    }
    const grade = toGrade(data.projectedGrade);
    if (
      grade === null ||
      GRADES[grade].rank > GRADES[ref.currentGrade].rank ||
      Math.abs(GRADES[grade].rank - GRADES[ref.projectedGrade].rank) > 1
    ) {
      return { reason: `개선 후 등급 ${String(data.projectedGrade)} (참고 ${ref.projectedGrade} ±1칸)` };
    }
    projectedPrimaryEnergyKwh = round1(energy);
    projectedGrade = grade;
  }

  let annualSavingsManwon: number | null = null;
  if (ref.annualSavingsManwon !== null && ref.annualEnergyCostManwon !== null) {
    const savings = Number(data.annualSavingsManwon);
    if (
      !Number.isFinite(savings) ||
      savings <= 0 ||
      savings > ref.annualEnergyCostManwon ||
      !isWithin(savings, ref.annualSavingsManwon, 0.3)
    ) {
      return { reason: `연간 절감액 ${data.annualSavingsManwon} (참고 ${ref.annualSavingsManwon}만원 ±30%)` };
    }
    annualSavingsManwon = Math.round(savings);
  }

  return {
    result: {
      data: {
        currentGrade: ref.currentGrade,
        currentPrimaryEnergyKwh: ref.currentPrimaryEnergyKwh,
        currentBasis: ref.currentBasis,
        annualEnergyCostManwon: ref.annualEnergyCostManwon,
        reductionPercent: Math.round(reductionPercent),
        projectedPrimaryEnergyKwh,
        projectedGrade,
        annualSavingsManwon,
      },
      report: lines.slice(0, REPORT_MAX_LINES),
      source: "gemini",
    },
  };
}

function firstLine(input: RemodelReportInput, reference: RemodelReference): string {
  const energy = reference.currentPrimaryEnergyKwh;
  const label = GRADES[reference.currentGrade].label;
  if (energy === null) {
    return `${input.buildingName}의 경우 비교할 인증 사례가 부족해 현재 1차에너지소요량을 숫자로 정하지 않았어요.`;
  }
  if (reference.currentBasis === "band") {
    return `${input.buildingName}의 추정 등급은 ${label}이라, 이 등급 구간의 중간값인 ${formatNumber(energy)} ${PRIMARY_ENERGY_UNIT}를 기준으로 계산했어요.`;
  }
  return `${input.buildingName}의 현재 에너지 등급은 ${label}이고, 1차에너지소요량은 ${formatNumber(energy)} ${PRIMARY_ENERGY_UNIT}예요.`;
}

/** Gemini 키가 없거나 호출·검증이 실패했을 때 참고값으로 쓰는 13줄 규칙 기반 리포트. */
export function fallbackRemodelReport(input: RemodelReportInput, reference: RemodelReference): RemodelReportResult {
  const { currentPrimaryEnergyKwh: current, projectedPrimaryEnergyKwh: projected, projectedGrade } = reference;
  const currentLabel = GRADES[reference.currentGrade].label;
  const heating = heatingLabel(input);

  const report = [
    firstLine(input, reference),
    "1차에너지소요량은 건물이 1년 동안 바닥 1㎡당 쓰는 에너지로, 낮을수록 등급이 올라가요.",
    "가장 효과가 큰 것은 외벽 단열 보강으로, 벽으로 새는 열을 막아 소요량을 약 18% 줄여요.",
    "고성능 창호로 바꾸면 웃풍과 창가 결로가 줄고 소요량이 약 15% 더 낮아져요.",
    "열회수 환기장치는 환기할 때 빠져나가는 열을 되살려 약 10%를 아껴 줘요.",
    "고효율 보일러로 교체하면 같은 난방에 드는 연료가 약 9% 줄어요.",
    "지붕·최상층 단열(약 8%)과 LED 조명 전환(약 4%)은 부담이 적어 먼저 시작하기 좋아요.",
    `여섯 가지를 함께 적용하면 효과가 겹쳐 1차에너지소요량이 모두 합해 약 ${reference.reductionPercent}% 줄어들어요.`,
    current !== null && projected !== null && projectedGrade !== null
      ? `그러면 ${formatNumber(current)}에서 ${formatNumber(projected)} ${PRIMARY_ENERGY_UNIT}로 낮아지고, 등급은 ${currentLabel}에서 ${GRADES[projectedGrade].label}으로 오를 것으로 예상돼요.`
      : "인증을 받거나 실제 사용량을 확인하면 개선 후 등급까지 숫자로 계산해 드릴 수 있어요.",
    reference.annualSavingsManwon !== null && reference.annualEnergyCostManwon !== null
      ? `연간 난방비(고정비) 약 ${formatNumber(reference.annualEnergyCostManwon)}만원 가운데 매년 ${formatNumber(reference.annualSavingsManwon)}만원 정도를 아낄 수 있어요.`
      : "에너지를 덜 쓰는 만큼 매달 나가는 난방비와 전기요금도 자연스럽게 줄어들어요.",
    input.checklist
      ? `입력해 주신 집 정보${heating ? `(${heating})` : ""}도 함께 고려해 우선순위를 정했어요.`
      : "주소 검색 때 집 정보를 입력하면 우리 집에 더 맞춘 결과를 볼 수 있어요.",
    "창호·단열 공사는 정부 그린리모델링 지원사업으로 비용 부담을 줄일 수 있어요.",
    "절감 하기에서 우리 집에 맞는 항목부터 하나씩 시작해 보세요.",
  ];

  const { basis: _basis, ...data } = reference;
  void _basis;
  return { data, report, source: "fallback" };
}

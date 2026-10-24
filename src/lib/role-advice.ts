import { GRADES, type GradeCode } from "../data/grades";

/**
 * Gemini Flash 연동: 등급 정보를 "소유주가 임차인에게 할 말" 또는 "임차인이
 * 취할 대처방안"으로 풀어써주는 프롬프트/폴백 로직.
 *
 * `src/lib/remodel-report.ts`와 같은 원칙 — 등급 숫자는 이미 계산된 값을
 * 그대로 넘기고, AI는 그 값을 역할(소유주/임차인)에 맞는 문장으로 설명하는
 * 역할만 맡는다.
 */

export type OccupantRole = "owner" | "tenant";

export interface RoleAdviceInput {
  buildingName: string;
  address: string;
  completionYear: number;
  useType: string;
  grade: GradeCode;
  isEstimated: boolean;
  primaryEnergyKwh: number;
  /** 상세 성적표가 아직 없는 건물이면 `null`. */
  annualSavingsPotentialManwon: number | null;
  role: OccupantRole;
}

const ROLE_TASK: Record<OccupantRole, string> = {
  owner:
    '건물 소유주가 임차인에게 현재 에너지 등급과 앞으로의 개선 방향을 어떻게 안내하면 좋을지, 임차인에게 그대로 전달해도 될 안내 문구를 한국어 존댓말 2~3문장으로 작성하세요.',
  tenant:
    "임차인이 이 등급 정보를 보고 지금 바로 취할 수 있는 대처방안을 한국어 존댓말 2~3문장으로 작성하세요. 임대인에게 요청해볼 만한 것과 스스로 실천할 수 있는 절약 방법을 함께 담으세요.",
};

export function buildRoleAdvicePrompt(input: RoleAdviceInput): string {
  const gradeLabel = GRADES[input.grade].label;

  const lines = [
    "당신은 에너지 효율 컨설턴트입니다. 아래 건물 정보만 근거로 답하세요.",
    ROLE_TASK[input.role],
    "새로운 숫자를 만들어내지 말고 주어진 값만 언급하세요. 결과 문장만 출력하세요",
    "(따옴표, 접두어, 마크다운 없이).",
    "",
    `- 건물명: ${input.buildingName}`,
    `- 주소: ${input.address}`,
    `- 준공 연도: ${input.completionYear}년`,
    `- 용도: ${input.useType}`,
    `- 등급 산정 방식: ${input.isEstimated ? "공공데이터 기반 추정 등급" : "한국에너지공단 인증 등급"}`,
    `- 현재 등급: ${gradeLabel} (1차에너지소요량 ${input.primaryEnergyKwh}kWh/㎡·yr)`,
  ];

  if (input.annualSavingsPotentialManwon) {
    lines.push(`- 권장 조치를 모두 실천할 경우 연간 절감액: 약 ${input.annualSavingsPotentialManwon}만원`);
  }

  return lines.join("\n");
}

const FALLBACK_ADVICE: Record<OccupantRole, (input: RoleAdviceInput) => string> = {
  owner: (input) =>
    `현재 ${GRADES[input.grade].label}으로 평가된 건물이에요. 임차인에게는 현재 등급을 안내하고, 단열·설비 개선을 검토하고 있다는 점을 함께 전달해보세요.`,
  tenant: (input) =>
    `현재 건물은 ${GRADES[input.grade].label}으로 평가됐어요. 임대인에게 단열·창호 상태 개선을 문의해보고, 그전까지는 사용하지 않는 공간의 난방을 줄이는 등부터 실천해보세요.`,
};

/** Gemini 호출이 실패하거나 API 키가 없을 때 대신 보여줄 규칙 기반 문구. */
export function fallbackRoleAdvice(input: RoleAdviceInput): string {
  return FALLBACK_ADVICE[input.role](input);
}

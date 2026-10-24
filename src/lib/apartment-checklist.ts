/**
 * "직접 입력한 집 정보" — 홈 화면 주소 검색에서 아파트를 고른 뒤 보여주는 간단한
 * 체크리스트(준공연도·건설사·난방방식)의 답변 타입과, 그 답변을 성적표 라우트로
 * 넘기기 위한 쿼리스트링 인코딩/디코딩. beec가 이 값들을 반영하는 API는 아직
 * 없어서, 지금은 성적표 페이지에 참고용으로 그대로 보여주기만 한다.
 */

export type HeatingType = "individual" | "district";

export interface ApartmentChecklistAnswers {
  completionYear: number | null;
  builder: string;
  heatingType: HeatingType | null;
}

export const HEATING_TYPE_OPTIONS: { value: HeatingType; label: string; description: string }[] = [
  { value: "individual", label: "개별난방", description: "세대마다 보일러를 따로 써요" },
  { value: "district", label: "지역난방", description: "단지·지역 전체가 난방을 공급받아요" },
];

const PARAM_YEAR = "cy";
const PARAM_BUILDER = "cb";
const PARAM_HEATING = "ch";

function isHeatingType(value: string | null): value is HeatingType {
  return value === "individual" || value === "district";
}

/** Appends the checklist answers as query params onto a report route path, if any were filled in. */
export function withApartmentChecklistParams(path: string, answers: ApartmentChecklistAnswers): string {
  const params = new URLSearchParams();
  if (answers.completionYear !== null) params.set(PARAM_YEAR, String(answers.completionYear));
  if (answers.builder.trim()) params.set(PARAM_BUILDER, answers.builder.trim());
  if (answers.heatingType) params.set(PARAM_HEATING, answers.heatingType);

  const query = params.toString();
  if (!query) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}

/** Reads the checklist answers back out of a Next.js `searchParams` object (server-side). */
export function readApartmentChecklistParams(
  searchParams: Record<string, string | string[] | undefined>,
): ApartmentChecklistAnswers | null {
  const read = (key: string) => {
    const raw = searchParams[key];
    return (Array.isArray(raw) ? raw[0] : raw)?.trim() || "";
  };

  const yearRaw = read(PARAM_YEAR);
  const year = yearRaw ? Number(yearRaw) : NaN;
  const completionYear = Number.isFinite(year) ? year : null;
  const builder = read(PARAM_BUILDER);
  const heatingRaw = read(PARAM_HEATING);
  const heatingType = isHeatingType(heatingRaw) ? heatingRaw : null;

  if (completionYear === null && !builder && !heatingType) return null;
  return { completionYear, builder, heatingType };
}

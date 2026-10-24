/**
 * 동네 비교 지도·순위에서 함께 쓰는 색 스케일과 API 호출.
 *
 * 색은 등급 하나로만 정합니다. 표본수까지 색에 섞으면 무엇을 보는 화면인지 알 수 없게 됩니다.
 * 표본수는 원의 크기로만 표현합니다.
 */

/** 백엔드 /api/districts 응답 한 건. */
export interface DistrictStat {
  key: string;                 // "서울 강서구"
  region: string;              // "서울"
  district: string;            // "강서구"  ← 좌표 파일과 조인하는 키
  purpose: string;             // "주거용"
  sampleCount: number;         // 해당 용도의 인증 건수
  totalCount: number;          // 용도 무관 전체 인증 건수
  insufficient: boolean;       // 표본이 기준 미만 — 등급을 매기지 않습니다
  grade: string | null;        // "1+등급"
  gradeCode: string | null;    // "1+"
  gradeRank: number | null;    // 1(가장 좋음) ~ 10
  rank: number | null;         // 등급 순 순위. insufficient 면 null
  lowSample: boolean;
}

export interface DistrictsResponse {
  found: boolean;
  region: string | null;
  purpose: string;
  total: number;
  ranked: number;
  insufficient: number;
  districts: DistrictStat[];
}

/** 좌표 파일 한 건. */
export interface DistrictCoord {
  district: string;
  lat: number;
  lng: number;
  region?: string;
  key?: string;
}

/** rank 1(1+++) → 초록, 10(7등급) → 붉은색. */
const SCALE = [
  "#0B6E4F", "#1B8A5A", "#3FA96A", "#7FC36E", "#C2CB5E",
  "#E8B84B", "#E3924A", "#D96B47", "#C24A45", "#9E2F3C",
];

/**
 * 인증 사례가 부족한 동네. 목록에서 지우지 말고 이 색으로 남겨두세요.
 * 전국 지도에서 지방이 비어 보이는 그림 자체가 "인증 사각지대" 라는 논점입니다.
 */
export const NO_DATA_COLOR = "#B9C4BD";

export function colorOfRank(rank: number | null | undefined): string {
  if (rank == null || rank < 1) return NO_DATA_COLOR;
  return SCALE[Math.min(SCALE.length, Math.max(1, rank)) - 1];
}

/** 표본수 → 원 지름(px). 제곱근을 쓰는 이유는 면적이 표본수에 비례하게 보이기 위해서입니다. */
export function radiusOfSample(count: number, min = 13, max = 44): number {
  const c = Math.max(0, count);
  const r = min + (max - min) * Math.min(1, Math.sqrt(c) / Math.sqrt(900));
  return Math.round(r);
}

const BASE =
  process.env.NEXT_PUBLIC_BEEC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

/**
 * 동네 목록을 한 번에 받아옵니다. 250여 개를 한 화면에 그리므로 한 번만 부릅니다.
 * purpose 를 생략하면 백엔드 기본값인 주거용입니다.
 */
export async function fetchDistricts(
  region?: string,
  purpose?: string,
  minSample = 5,
): Promise<DistrictStat[]> {
  const qs = new URLSearchParams();
  if (region) qs.set("region", region);
  if (purpose) qs.set("purpose", purpose);
  qs.set("minSample", String(minSample));

  const res = await fetch(`${BASE}/api/districts?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`동네 목록을 불러오지 못했습니다 (${res.status})`);

  const json: DistrictsResponse = await res.json();
  return json.districts ?? [];
}

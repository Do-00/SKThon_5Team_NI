import { API_BASE_URL } from "./api-base-url";
import type { MatchResult } from "./beec-client";
import type { KakaoPostcodeData } from "./kakao-postcode";

/**
 * Browser-side calls for the home hero's address lookup. Unlike the
 * server-side helpers in `beec-client.ts`, these run in the browser straight
 * against `NEXT_PUBLIC_API_BASE_URL` (beec allows any origin via `@CrossOrigin`).
 */

/** Report figures beec doesn't provide yet — same shape as the report page's `ReportMetrics`. */
export interface EnergyMetrics {
  /** Estimated annual heating cost, in 만원 (10,000 KRW) units. */
  annualEnergyCostManwon: number;
  /** Shown as "절감 여지", in percent. */
  percentileRank: number;
  /** Estimated annual carbon emissions, in metric tons of CO2. */
  annualCarbonEmissionTons: number;
  /** Annual savings if every recommended action is taken, in 만원 units. */
  annualSavingsPotentialManwon: number;
}

async function getJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`${path} error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * beec extracts its 동+번지 match key from the 지번 address (도로명 alone
 * carries no 동), so fall back to Kakao's auto-matched 지번 when the user
 * clicked the road-address row.
 */
export function toJibunAddress(data: KakaoPostcodeData): string {
  return data.jibunAddress || data.autoJibunAddress;
}

/** Looks up the picked address in beec's 실측 데이터 (`/api/match`), sending every field it can match on. */
export function matchPostcodeAddress(data: KakaoPostcodeData): Promise<MatchResult> {
  return getJson<MatchResult>("/api/match", {
    jibunAddress: toJibunAddress(data),
    roadAddress: data.roadAddress || data.autoRoadAddress,
    buildingName: data.buildingName,
  });
}

/**
 * Report figures for a building. beec has no such endpoint yet, so this
 * calls our own same-origin `/api/energy-cost` route handler (a relative
 * URL, resolved against the page's own origin — not beec's `API_BASE_URL`),
 * which computes them from `primaryEnergyKwh × areaSqm` rather than a flat
 * per-grade table. It used to go through MSW mocking a request to beec's
 * origin instead, but that only worked when the browser's mock Service
 * Worker registered successfully, which isn't reliable everywhere — so the
 * "개선 후" tab and savings card would silently disappear whenever
 * registration failed.
 */
export async function fetchEnergyCost(
  gradeCode: string,
  primaryEnergyKwh: number,
  areaSqm: number,
  /**
   * "개별난방" · "지역난방" · "중앙난방". 넘기면 난방 방식에 맞는 배출계수를 씁니다.
   * 생략하면 전력 계수로 계산해 탄소 배출이 크게(보수적으로) 나옵니다 —
   * 도시가스 난방인데 생략하면 두 배 넘게 부풀려지므로 가능하면 꼭 넘기세요.
   */
  heatingType?: string,
): Promise<EnergyMetrics> {
  const params = new URLSearchParams({
    gradeCode,
    primaryEnergyKwh: String(primaryEnergyKwh),
    areaSqm: String(areaSqm),
    ...(heatingType ? { heatingType } : {}),
  });
  const res = await fetch(`/api/energy-cost?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`/api/energy-cost error: ${res.status}`);
  }
  return res.json() as Promise<EnergyMetrics>;
}

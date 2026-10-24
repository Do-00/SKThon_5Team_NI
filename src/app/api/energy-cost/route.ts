import { NextResponse } from "next/server";
import { GRADES } from "@/src/data/grades";
import type { EnergyMetrics } from "@/src/lib/eco-api";

/**
 * Report figures beec doesn't provide yet (연간 난방비·절감 여지·탄소 배출·전부
 * 실천 시 절감액). Used to be a flat lookup keyed by grade alone — two
 * buildings with the same grade but very different sizes got identical
 * numbers. Now computed from the building's own 1차에너지소요량 × 연면적, so
 * it scales with the real data we actually have (`primaryEnergyKwh`,
 * `areaSqm`) instead of only its 10-bucket grade.
 *
 * The unit cost and emission factor below are demo constants, not a live
 * utility rate or an official figure — beec has no 요금·배출계수 endpoint, so
 * there's no "real" number to defer to. Chosen to land in a believable range
 * for Korean residential heating (blended 도시가스/전기 cost; 2021 전력 배출계수).
 */
const WON_PER_KWH = 110;

/**
 * 난방 방식별 온실가스 배출계수 (kgCO₂/kWh).
 *
 * 예전에는 난방 방식과 무관하게 전력 계수 0.4781 하나를 썼습니다.
 * 이 서비스가 다루는 아파트의 68%가 도시가스 개별난방인데, 도시가스에
 * 전력 계수를 쓰면 탄소 배출이 두 배 넘게 부풀려집니다.
 * (실제로 화면에 11.1 tCO₂ 로 나오던 단지의 실제 값은 5 tCO₂ 근처입니다.)
 *
 * 값의 출처
 *   도시가스  IPCC 천연가스 연소 배출계수 56,100 kgCO₂/TJ 를 kWh 로 환산 → 0.202
 *   지역난방  탄소공간지도(한국환경공단) 열 간접 배출계수 0.1226
 *   전력      환경부 온실가스종합정보센터 국가 전력 배출계수 (2021년) 0.4781
 *
 * 한계: 1차에너지소요량에는 이미 1차에너지 환산계수(전력 2.75, 가스 1.1 등)가
 * 반영돼 있어서, 거기에 연료별 배출계수를 곱하는 것은 근사입니다.
 * 정확히 하려면 용도별 최종에너지 소비를 따로 받아야 하는데 그 데이터가 없습니다.
 * 화면에서는 반드시 "추정" 이라고 밝히세요.
 */
const CO2_GAS = 0.202;       // 도시가스 연소
const CO2_DISTRICT = 0.1226; // 지역난방(열)
const CO2_ELECTRIC = 0.4781; // 전력. 난방 방식을 모를 때의 기본값이기도 합니다

/**
 * 난방 방식 문자열 → 배출계수.
 *
 * 완전 일치로 찾으면 안 됩니다. 출처마다 표기가 다릅니다.
 *   K-apt          "개별난방" · "지역난방" · "중앙난방"
 *   픽스처/사용자 입력  "개별 도시가스" · "개별가스보일러난방"
 * 완전 일치만 보면 뒤쪽이 전부 기본값(전력)으로 떨어져 배출량이 두 배가 됩니다.
 * 그래서 키워드 포함 여부로 판정합니다.
 */
function emissionFactor(heatingType: string | null): number {
  if (!heatingType) return CO2_ELECTRIC;
  const t = heatingType.replace(/\s+/g, "");

  if (t.includes("지역")) return CO2_DISTRICT;
  if (t.includes("전기") || t.includes("전력")) return CO2_ELECTRIC;
  // 가스·보일러·개별·중앙은 모두 도시가스 연소로 봅니다.
  if (t.includes("가스") || t.includes("보일러") || t.includes("개별") || t.includes("중앙")) return CO2_GAS;

  return CO2_ELECTRIC;
}

/**
 * 절감 여지의 하한·상한.
 *
 * 상한이 60이었는데, 그러면 계산 결과가 상한에 걸려도 화면에는 "60%" 라고만 찍힙니다.
 * 실제로 160 kWh 인 단지는 (160−60)/160 = 62.5% 인데 60% 로 잘려 나갔습니다.
 * 7등급(400 kWh 선)이 1+++ 까지 가는 경우가 이론적 최대라 85% 로 올립니다.
 * 이제 화면의 숫자는 잘린 값이 아니라 계산된 값입니다.
 */
const MIN_SAVINGS_POTENTIAL_PCT = 3;
const MAX_SAVINGS_POTENTIAL_PCT = 85;

const EXAMPLE_ENERGY_COST: Record<string, EnergyMetrics> = {
  "1+++": { annualEnergyCostManwon: 38, percentileRank: 5, annualCarbonEmissionTons: 1.0, annualSavingsPotentialManwon: 4 },
  "1++": { annualEnergyCostManwon: 52, percentileRank: 8, annualCarbonEmissionTons: 1.3, annualSavingsPotentialManwon: 8 },
  "1+": { annualEnergyCostManwon: 66, percentileRank: 12, annualCarbonEmissionTons: 1.7, annualSavingsPotentialManwon: 14 },
  "1": { annualEnergyCostManwon: 80, percentileRank: 16, annualCarbonEmissionTons: 2.0, annualSavingsPotentialManwon: 22 },
  "2": { annualEnergyCostManwon: 94, percentileRank: 20, annualCarbonEmissionTons: 2.4, annualSavingsPotentialManwon: 32 },
  "3": { annualEnergyCostManwon: 108, percentileRank: 24, annualCarbonEmissionTons: 2.8, annualSavingsPotentialManwon: 45 },
  "4": { annualEnergyCostManwon: 124, percentileRank: 28, annualCarbonEmissionTons: 3.2, annualSavingsPotentialManwon: 62 },
  "5": { annualEnergyCostManwon: 142, percentileRank: 31, annualCarbonEmissionTons: 3.6, annualSavingsPotentialManwon: 94 },
  "6": { annualEnergyCostManwon: 163, percentileRank: 38, annualCarbonEmissionTons: 4.1, annualSavingsPotentialManwon: 120 },
  "7": { annualEnergyCostManwon: 188, percentileRank: 45, annualCarbonEmissionTons: 4.7, annualSavingsPotentialManwon: 150 },
};

/** Falls back to the flat per-grade table when a building's own numbers aren't usable (missing/zero area, unknown grade). */
function fallback(gradeCode: string): EnergyMetrics {
  return EXAMPLE_ENERGY_COST[gradeCode] ?? EXAMPLE_ENERGY_COST["5"];
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const gradeCode = params.get("gradeCode") ?? "";
  const primaryEnergyKwh = Number(params.get("primaryEnergyKwh"));
  const areaSqm = Number(params.get("areaSqm"));
  const heatingType = params.get("heatingType");

  if (!Number.isFinite(primaryEnergyKwh) || primaryEnergyKwh <= 0 || !Number.isFinite(areaSqm) || areaSqm <= 0) {
    return NextResponse.json(fallback(gradeCode));
  }

  const annualTotalKwh = primaryEnergyKwh * areaSqm;
  const annualEnergyCostManwon = Math.round((annualTotalKwh * WON_PER_KWH) / 10000);
  const co2PerKwh = emissionFactor(heatingType);
  const annualCarbonEmissionTons = Math.round(((annualTotalKwh * co2PerKwh) / 1000) * 10) / 10;

  // 1+++ 등급 상한(60 kWh/m²·yr)까지 줄일 여지를 절감 여지(%)로 본다 — 지금
  // 얼마나 더 좋아질 수 있는지를 이 건물 자신의 숫자로 계산한다.
  const bestPossibleKwh = GRADES["1+++"].maxPrimaryEnergyKwh ?? 60;
  const rawPotentialPct = ((primaryEnergyKwh - bestPossibleKwh) / primaryEnergyKwh) * 100;
  const percentileRank = Math.round(
    Math.min(MAX_SAVINGS_POTENTIAL_PCT, Math.max(MIN_SAVINGS_POTENTIAL_PCT, rawPotentialPct)),
  );

  const annualSavingsPotentialManwon = Math.round((annualEnergyCostManwon * percentileRank) / 100);

  const metrics: EnergyMetrics = {
    annualEnergyCostManwon,
    percentileRank,
    annualCarbonEmissionTons,
    annualSavingsPotentialManwon,
  };
  return NextResponse.json(metrics);
}

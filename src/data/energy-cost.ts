import type { EnergyMetrics } from "../lib/eco-api";

/**
 * 등급별 예시 성적표 수치 — beec에 아직 난방비 API가 없어서 쓰는 고정값입니다.
 * MSW가 `/api/energy-cost`로 이 값을 응답하고(`src/mocks/handlers.ts`), MSW가
 * 안 떠 있을 때(서비스 워커 등록 실패, 프로덕션 빌드)는 성적표가 직접 이 값을 씁니다.
 * 난방비(만원) · 절감 여지(%) · 탄소 배출(tCO₂) · 전부 실천 시 절감액(만원).
 * 값을 바꿔 가며 실험하세요. 표에 없는 등급은 '5' 값을 씁니다.
 */
export const EXAMPLE_ENERGY_COST: Readonly<Record<string, EnergyMetrics>> = {
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

/** Example figures for a grade code, falling back to grade `"5"` like the MSW handler. */
export function getExampleEnergyCost(gradeCode: string): EnergyMetrics {
  return EXAMPLE_ENERGY_COST[gradeCode] ?? EXAMPLE_ENERGY_COST["5"];
}

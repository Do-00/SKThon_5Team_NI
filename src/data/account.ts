import { getBuildingById, type BuildingGradeSource } from "./buildings";
import type { GradeCode } from "./grades";

/**
 * Signed-in user account and their Eco Check report fixtures.
 */

/**
 * Applicant category used to gate eligibility for eco actions
 * (`EcoActionUserType` in `src/data/actions.ts`) and support programs
 * (`SupportProgramUserType` in `src/data/programs.ts`).
 */
export type UserType = "owner" | "tenant" | "hoa" | "corporation" | "general";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  /** Id of the building this account's Eco Check report is generated for. */
  primaryBuildingId: string;
  /** Applicant category used to match eco actions and support programs. */
  userType: UserType;
}

export interface EcoCheckReport {
  buildingId: string;
  buildingName: string;
  grade: GradeCode;
  /** Whether `grade` is from an official certificate or an internal estimate (see `src/data/buildings.ts`). */
  gradeSource: BuildingGradeSource;
  /** Annual primary energy consumption backing `grade`, in kWh/m²·yr (see `PRIMARY_ENERGY_UNIT` in `src/data/grades.ts`). */
  primaryEnergyKwh: number;
  /** Estimated current annual energy cost, in 만원 (10,000 KRW) units. */
  annualEnergyCostManwon: number;
  /** Percentile rank among all assessed buildings (e.g. `31` = "상위 31%"). */
  percentileRank: number;
  /** Estimated annual carbon emissions, in metric tons of CO2. */
  annualCarbonEmissionTons: number;
  /** Estimated annual savings achievable by adopting the recommended eco actions, in 만원 units. */
  annualSavingsPotentialManwon: number;
  /** ISO 8601 timestamp of when the report was generated. */
  generatedAt: string;
}

const USER_ACCOUNT: UserAccount = {
  id: "user-001",
  name: "김에코",
  email: "eco.kim@example.com",
  primaryBuildingId: "bld-001",
  userType: "owner",
};

/**
 * Report figures that aren't already carried by the building record (see
 * `src/data/buildings.ts`). `grade`/`gradeSource`/`primaryEnergyKwh` are
 * intentionally *not* duplicated here — `getEcoCheckReport` reads them live
 * from `getBuildingById` so the report and the building fixture can never
 * disagree (e.g. `bld-001`'s grade, the report's grade, and
 * `CURRENT_BUILDING_GRADE` in `src/data/grades.ts` all stay `"5"`).
 */
const REPORT_META = {
  annualEnergyCostManwon: 142,
  percentileRank: 31,
  annualCarbonEmissionTons: 3.6,
  annualSavingsPotentialManwon: 94,
  generatedAt: "2026-09-01T10:00:00+09:00",
} as const;

/** Returns the current signed-in user's account. */
export async function getUserAccount(): Promise<UserAccount> {
  return { ...USER_ACCOUNT };
}

/**
 * Returns the current user's Eco Check report for their primary building.
 * Grade and energy figures are sourced live from `src/data/buildings.ts`
 * (see `REPORT_META` above) rather than duplicated as static fixtures.
 */
export async function getEcoCheckReport(): Promise<EcoCheckReport> {
  const building = await getBuildingById(USER_ACCOUNT.primaryBuildingId);
  if (!building) {
    throw new Error(`Primary building "${USER_ACCOUNT.primaryBuildingId}" not found in fixtures.`);
  }

  return {
    buildingId: building.id,
    buildingName: building.name,
    grade: building.grade,
    gradeSource: building.gradeSource,
    primaryEnergyKwh: building.primaryEnergyKwh,
    ...REPORT_META,
  };
}

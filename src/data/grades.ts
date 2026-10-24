/**
 * Eco Check grade fixtures.
 *
 * Buildings are rated on their annual **primary energy consumption**
 * (1차에너지소요량, kWh/m²·yr — lower is better) and bucketed into one of the
 * 10 grades below, ordered from best (`1+++`) to worst (`7`), mirroring
 * Korea's 건축물 에너지효율등급 (Building Energy Efficiency Rating) scale for
 * residential buildings (공동주택 기준).
 */

export type GradeCode =
  | "1+++"
  | "1++"
  | "1+"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7";

/** Grade codes ordered from best to worst. */
export const GRADE_ORDER: readonly GradeCode[] = [
  "1+++",
  "1++",
  "1+",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
];

/** Unit used for every primary-energy figure in this module. */
export const PRIMARY_ENERGY_UNIT = "kWh/m²·yr";

export interface GradeDefinition {
  code: GradeCode;
  /** 1 = best grade, 10 = worst grade. */
  rank: number;
  /** Display label, e.g. "1+++등급". */
  label: string;
  /**
   * Inclusive lower bound of annual primary energy consumption (kWh/m²·yr,
   * see `PRIMARY_ENERGY_UNIT`) that falls into this grade.
   */
  minPrimaryEnergyKwh: number;
  /**
   * Exclusive upper bound of annual primary energy consumption (kWh/m²·yr)
   * that falls into this grade, or `null` when open-ended (grade `"7"`,
   * i.e. "370 이상").
   */
  maxPrimaryEnergyKwh: number | null;
}

/**
 * Official-style primary-energy thresholds per grade (공동주택/residential
 * edition), kWh/m²·yr, lower is better. Ranges are half-open
 * `[min, max)` so every value maps to exactly one grade with no gaps or
 * overlaps at the boundaries.
 */
export const GRADES: Readonly<Record<GradeCode, GradeDefinition>> = {
  "1+++": { code: "1+++", rank: 1, label: "1+++등급", minPrimaryEnergyKwh: 0, maxPrimaryEnergyKwh: 60 },
  "1++": { code: "1++", rank: 2, label: "1++등급", minPrimaryEnergyKwh: 60, maxPrimaryEnergyKwh: 90 },
  "1+": { code: "1+", rank: 3, label: "1+등급", minPrimaryEnergyKwh: 90, maxPrimaryEnergyKwh: 120 },
  "1": { code: "1", rank: 4, label: "1등급", minPrimaryEnergyKwh: 120, maxPrimaryEnergyKwh: 150 },
  "2": { code: "2", rank: 5, label: "2등급", minPrimaryEnergyKwh: 150, maxPrimaryEnergyKwh: 190 },
  "3": { code: "3", rank: 6, label: "3등급", minPrimaryEnergyKwh: 190, maxPrimaryEnergyKwh: 230 },
  "4": { code: "4", rank: 7, label: "4등급", minPrimaryEnergyKwh: 230, maxPrimaryEnergyKwh: 270 },
  "5": { code: "5", rank: 8, label: "5등급", minPrimaryEnergyKwh: 270, maxPrimaryEnergyKwh: 320 },
  "6": { code: "6", rank: 9, label: "6등급", minPrimaryEnergyKwh: 320, maxPrimaryEnergyKwh: 370 },
  "7": { code: "7", rank: 10, label: "7등급", minPrimaryEnergyKwh: 370, maxPrimaryEnergyKwh: null },
};

export interface GradeDistributionEntry {
  grade: GradeCode;
  label: string;
  /** Number of buildings in this grade, or `null` for the current building's own grade slot. */
  count: number | null;
  /** `true` for the single grade slot that represents the current/subject building. */
  isCurrentBuildingGrade: boolean;
}

/**
 * Distribution of buildings across every grade, sourced from the Eco Check
 * report for the current building (whose own grade is `5`, see
 * `CURRENT_BUILDING_GRADE`). The current building's slot carries
 * `count: null` rather than a peer count.
 */
const GRADE_DISTRIBUTION_COUNTS: Readonly<Record<GradeCode, number | null>> = {
  "1+++": 42,
  "1++": 1134,
  "1+": 1091,
  "1": 294,
  "2": 26,
  "3": 7,
  "4": 0,
  "5": null,
  "6": 0,
  "7": 0,
};

/**
 * Grade of the building shown in the Eco Check report (see
 * `src/data/account.ts` and `src/data/buildings.ts`, where the report's
 * primary building — `bld-001` — is also pinned to this grade so the two
 * fixtures can never disagree).
 */
export const CURRENT_BUILDING_GRADE: GradeCode = "5";

/** Returns every grade definition, ordered from best to worst. */
export async function getGrades(): Promise<GradeDefinition[]> {
  return GRADE_ORDER.map((code) => GRADES[code]);
}

/** Returns a single grade definition by its code, if it exists. */
export async function getGradeByCode(code: GradeCode): Promise<GradeDefinition | undefined> {
  return GRADES[code];
}

/**
 * Returns the grade whose primary-energy range (see `PRIMARY_ENERGY_UNIT`)
 * contains the given annual consumption value.
 */
export async function getGradeByPrimaryEnergy(kwhPerM2PerYear: number): Promise<GradeDefinition | undefined> {
  return GRADE_ORDER.map((code) => GRADES[code]).find(
    (grade) =>
      kwhPerM2PerYear >= grade.minPrimaryEnergyKwh &&
      (grade.maxPrimaryEnergyKwh === null || kwhPerM2PerYear < grade.maxPrimaryEnergyKwh),
  );
}

/**
 * @deprecated Renamed to `getGradeByPrimaryEnergy` now that grades are
 * derived from annual primary energy consumption (kWh/m²·yr) rather than a
 * 0-100 eco score. Kept as an alias for backward compatibility.
 */
export const getGradeByScore = getGradeByPrimaryEnergy;

/** Returns the building-count distribution across all grades, best to worst. */
export async function getGradeDistribution(): Promise<GradeDistributionEntry[]> {
  return GRADE_ORDER.map((code) => ({
    grade: code,
    label: GRADES[code].label,
    count: GRADE_DISTRIBUTION_COUNTS[code],
    isCurrentBuildingGrade: code === CURRENT_BUILDING_GRADE,
  }));
}

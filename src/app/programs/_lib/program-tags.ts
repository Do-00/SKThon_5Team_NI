import type { SupportProgram } from "@/src/data/programs";

export interface ProgramFilter {
  /** Stable id, also used as the `?tag=` deep-link value. */
  id: string;
  label: string;
  matches: (program: SupportProgram) => boolean;
}

/** Topic tags surfaced as quick filters, in display order (only those present in the data are shown). */
const TOPIC_TAGS = [
  "단열",
  "창호",
  "보일러",
  "태양광",
  "조명",
  "바우처",
  "냉방",
  "방수",
  "안전시설",
  "집수리",
] as const;

/**
 * Filter chips for the programs list: 전체, 맞춤 (matched to the user's
 * building), applicant type, then a curated set of topic tags. Deterministic
 * and side-effect free — derived from existing `matched`,
 * `eligibleUserTypes`, and `tags` fields.
 */
export function getProgramFilters(programs: SupportProgram[]): ProgramFilter[] {
  const presentTags = new Set(programs.flatMap((program) => program.tags));
  return [
    { id: "all", label: "전체", matches: () => true },
    { id: "matched", label: "맞춤", matches: (program) => program.matched },
    { id: "owner", label: "소유주", matches: (program) => program.eligibleUserTypes.includes("owner") },
    { id: "tenant", label: "임차인", matches: (program) => program.eligibleUserTypes.includes("tenant") },
    ...TOPIC_TAGS.filter((tag) => presentTags.has(tag)).map((tag) => ({
      id: tag,
      label: tag,
      matches: (program: SupportProgram) => program.tags.includes(tag),
    })),
  ];
}

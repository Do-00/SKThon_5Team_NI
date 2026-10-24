/**
 * Admin dashboard fixtures: platform-wide stats and recent support-program
 * applications.
 */

export interface AdminStats {
  /** Total number of buildings that have run an Eco Check. */
  totalBuildingsChecked: number;
  /** Total number of support-program applications submitted. */
  totalApplications: number;
  /** Applications currently awaiting review. */
  pendingApplications: number;
  /** Month-over-month growth in applications, as a percentage. */
  monthlyGrowthRatePercent: number;
}

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface ProgramApplication {
  id: string;
  buildingName: string;
  programName: string;
  applicantName: string;
  status: ApplicationStatus;
  /** ISO 8601 timestamp of when the application was submitted. */
  submittedAt: string;
}

const ADMIN_STATS: AdminStats = {
  totalBuildingsChecked: 12480,
  totalApplications: 327,
  pendingApplications: 41,
  monthlyGrowthRatePercent: 2.1,
};

const RECENT_APPLICATIONS: readonly ProgramApplication[] = [
  {
    id: "appl-001",
    buildingName: "월드컵파크 10단지",
    programName: "건물 에너지효율화 사업(BRP) 융자지원",
    applicantName: "김에코",
    status: "pending",
    submittedAt: "2026-09-09T11:20:00+09:00",
  },
  {
    id: "appl-002",
    buildingName: "마포한강푸르지오",
    programName: "서울시 그린리모델링 이자 지원사업",
    applicantName: "박그린",
    status: "approved",
    submittedAt: "2026-09-08T15:05:00+09:00",
  },
  {
    id: "appl-003",
    buildingName: "상암월드컵파크 7단지",
    programName: "신재생에너지 보급지원사업(태양광)",
    applicantName: "이솔라",
    status: "pending",
    submittedAt: "2026-09-07T09:40:00+09:00",
  },
  {
    id: "appl-004",
    buildingName: "상암DMC래미안e편한세상",
    programName: "제로에너지건축물 인증 지원사업",
    applicantName: "최제로",
    status: "rejected",
    submittedAt: "2026-09-05T13:50:00+09:00",
  },
  {
    id: "appl-005",
    buildingName: "월드컵파크 10단지",
    programName: "온실가스 감축설비 지원사업",
    applicantName: "정탄소",
    status: "approved",
    submittedAt: "2026-09-03T16:30:00+09:00",
  },
];

/** Returns the platform-wide admin dashboard stats. */
export async function getAdminStats(): Promise<AdminStats> {
  return { ...ADMIN_STATS };
}

/** Returns the most recent support-program applications, newest first. */
export async function getRecentApplications(): Promise<ProgramApplication[]> {
  return [...RECENT_APPLICATIONS];
}

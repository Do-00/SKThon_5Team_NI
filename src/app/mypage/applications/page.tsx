import type { Metadata } from "next";
import { Badge, ButtonLink, Card } from "../../../components/ui";
import type { BadgeTone } from "../../../components/ui";
import { getUserAccount } from "../../../data/account";
import { getRecentApplications } from "../../../data/admin";
import type { ApplicationStatus } from "../../../data/admin";
import { formatDate } from "../../../lib/format";
import { MypageShell } from "../_components/MypageShell";

export const metadata: Metadata = {
  title: "신청 내역",
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: "심사 중",
  approved: "승인 완료",
  rejected: "반려",
};

const STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  pending: "caution",
  approved: "good",
  rejected: "danger",
};

export default async function MypageApplicationsPage() {
  const [account, applications] = await Promise.all([getUserAccount(), getRecentApplications()]);
  const myApplications = applications
    .filter((application) => application.applicantName === account.name)
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));

  return (
    <MypageShell
      active="applications"
      title="신청 내역"
      description="지원사업 신청 현황과 처리 상태를 확인하세요."
    >
      {myApplications.length === 0 ? (
        <Card className="text-center text-[var(--text-muted)]">아직 신청한 지원사업이 없습니다.</Card>
      ) : (
        <ul className="flex flex-col gap-[var(--space-4)]">
          {myApplications.map((application) => (
            <li key={application.id}>
              <Card className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[length:var(--text-caption-size)] font-bold text-[var(--text-muted)]">
                    {application.buildingName}
                  </p>
                  <h2 className="mt-[var(--space-1)] text-[length:var(--text-subhead-size)] font-bold text-[var(--text-strong)]">
                    {application.programName}
                  </h2>
                  <p className="mt-[var(--space-1)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
                    {formatDate(application.submittedAt)} 신청
                  </p>
                </div>
                <Badge tone={STATUS_TONE[application.status]} className="self-start sm:self-center">
                  {STATUS_LABEL[application.status]}
                </Badge>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card className="flex flex-col items-start gap-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[length:var(--text-body-size)] text-[var(--text-body)]">
          아직 신청하지 않은 지원사업이 궁금하다면 전체 지원사업 목록을 확인해보세요.
        </p>
        <ButtonLink href="/programs" variant="outline" size="sm">
          지원사업 전체 보기
        </ButtonLink>
      </Card>
    </MypageShell>
  );
}

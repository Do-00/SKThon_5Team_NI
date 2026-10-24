import type { Metadata } from "next";
import { Badge } from "../../../components/ui";
import type { BadgeTone } from "../../../components/ui";
import type { ApplicationStatus } from "../../../data/admin";
import { getRecentApplications } from "../../../data/admin";
import { AdminShell } from "../_components/AdminShell";
import { ApplicationsTable } from "../_components/ApplicationsTable";

export const metadata: Metadata = {
  title: "신청 관리",
};

const STATUS_ORDER: readonly ApplicationStatus[] = ["pending", "approved", "rejected"];

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

export default async function AdminApplicationsPage() {
  const applications = await getRecentApplications();

  return (
    <AdminShell
      active="applications"
      title="신청 관리"
      description="지원사업 신청 건을 상태별로 확인할 수 있는 기본 화면입니다."
    >
      <div className="flex flex-col gap-[var(--space-8)]">
        {STATUS_ORDER.map((status) => {
          const group = applications.filter((application) => application.status === status);
          if (group.length === 0) return null;

          return (
            <section key={status} aria-labelledby={`admin-applications-${status}`} className="flex flex-col gap-[var(--space-3)]">
              <div className="flex items-center gap-[var(--space-3)]">
                <h2 id={`admin-applications-${status}`} className="eco-heading">
                  {STATUS_LABEL[status]}
                </h2>
                <Badge tone={STATUS_TONE[status]}>{group.length}건</Badge>
              </div>
              <ApplicationsTable applications={group} caption={`${STATUS_LABEL[status]} 상태의 지원사업 신청 내역`} />
            </section>
          );
        })}
      </div>

      <p className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
        이 화면은 프로토타입으로 승인/반려 처리 등 실제 심사 기능은 제공되지 않습니다. 표시되는 항목은 목업
        데이터 {applications.length}건입니다.
      </p>
    </AdminShell>
  );
}

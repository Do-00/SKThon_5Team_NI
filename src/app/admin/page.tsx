import type { Metadata } from "next";
import { ReportMetric } from "../../components/domain";
import { SectionHeader } from "../../components/layout";
import { getAdminStats, getRecentApplications } from "../../data/admin";
import { formatNumber, formatPercent } from "../../lib/format";
import { AdminShell } from "./_components/AdminShell";
import { ApplicationsTable } from "./_components/ApplicationsTable";

export const metadata: Metadata = {
  title: "관리자 대시보드",
};

export default async function AdminDashboardPage() {
  const [stats, applications] = await Promise.all([getAdminStats(), getRecentApplications()]);
  const recentApplications = applications.slice(0, 5);

  return (
    <AdminShell
      active="dashboard"
      title="관리자 대시보드"
      description="에코체크 플랫폼의 진단 현황과 지원사업 신청 현황을 확인하세요."
    >
      <div className="grid grid-cols-1 gap-[var(--gap-card)] sm:grid-cols-2 xl:grid-cols-4">
        <ReportMetric label="누적 건물 진단 수" value={formatNumber(stats.totalBuildingsChecked)} unit="동" />
        <ReportMetric label="총 지원사업 신청 수" value={formatNumber(stats.totalApplications)} unit="건" />
        <ReportMetric
          label="심사 대기 중인 신청"
          value={formatNumber(stats.pendingApplications)}
          unit="건"
          tone="caution"
          helpText="검토가 필요합니다"
        />
        <ReportMetric
          label="전월 대비 신청 증가율"
          value={formatPercent(stats.monthlyGrowthRatePercent, { signed: true })}
          tone={stats.monthlyGrowthRatePercent >= 0 ? "good" : "warn"}
        />
      </div>

      <section aria-labelledby="admin-recent-applications" className="flex flex-col gap-[var(--space-4)]">
        <SectionHeader
          as="h2"
          title="최근 신청 내역"
          description="가장 최근에 접수된 지원사업 신청 5건입니다."
          action={{ label: "전체 신청 관리", href: "/admin/applications" }}
        />
        <ApplicationsTable applications={recentApplications} caption="최근 접수된 지원사업 신청 내역" />
      </section>
    </AdminShell>
  );
}

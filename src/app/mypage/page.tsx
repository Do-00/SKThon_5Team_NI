import type { Metadata } from "next";
import { EnergyGradeBadge } from "../../components/domain";
import { ButtonLink, Card, Icon } from "../../components/ui";
import { SectionHeader } from "../../components/layout";
import { getEcoCheckReport, getUserAccount } from "../../data/account";
import { getSavedBuildings } from "../../data/buildings";
import { getRecentApplications } from "../../data/admin";
import { formatDate, formatDistance, formatManwon, formatPercent } from "../../lib/format";
import { MypageShell } from "./_components/MypageShell";

export const metadata: Metadata = {
  title: "마이페이지",
};

export default async function MypageOverviewPage() {
  const [account, report, savedBuildings, applications] = await Promise.all([
    getUserAccount(),
    getEcoCheckReport(),
    getSavedBuildings(),
    getRecentApplications(),
  ]);

  const myApplications = applications.filter((application) => application.applicantName === account.name);
  const pendingCount = myApplications.filter((application) => application.status === "pending").length;

  return (
    <MypageShell
      active="overview"
      title={`${account.name}님, 안녕하세요`}
      description="저장한 건물과 신청 내역을 한눈에 확인하세요."
    >
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-4)]">
          <div>
            <h2 className="eco-subhead text-[var(--text-strong)]">계정 요약</h2>
            <p className="mt-[var(--space-1)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
              {account.email}
            </p>
          </div>
          <EnergyGradeBadge grade={report.grade} showLabel size="lg" />
        </div>
        <dl className="mt-[var(--space-6)] grid grid-cols-2 gap-[var(--space-4)] sm:grid-cols-4">
          <div>
            <dt className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">대표 건물</dt>
            <dd className="mt-[var(--space-1)] font-bold text-[var(--text-strong)]">{report.buildingName}</dd>
          </div>
          <div>
            <dt className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">예상 연간 에너지 비용</dt>
            <dd className="mt-[var(--space-1)] font-bold text-[var(--text-strong)]">
              {formatManwon(report.annualEnergyCostManwon)}
            </dd>
          </div>
          <div>
            <dt className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">에너지 효율 순위</dt>
            <dd className="mt-[var(--space-1)] font-bold text-[var(--text-strong)]">
              상위 {formatPercent(report.percentileRank)}
            </dd>
          </div>
          <div>
            <dt className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">절감 가능 금액</dt>
            <dd className="mt-[var(--space-1)] font-bold text-[var(--status-good)]">
              연 {formatManwon(report.annualSavingsPotentialManwon)}
            </dd>
          </div>
        </dl>
        <p className="mt-[var(--space-4)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
          {formatDate(report.generatedAt)} 기준 에코체크 리포트
        </p>
      </Card>

      <section aria-labelledby="mypage-saved-buildings">
        <SectionHeader
          as="h2"
          title="저장한 건물"
          description="에코체크를 실행하고 저장한 건물입니다."
          action={{ label: "전체 보기", href: "/mypage/buildings" }}
        />
        <ul className="mt-[var(--space-4)] grid grid-cols-1 gap-[var(--gap-card)] sm:grid-cols-2">
          {savedBuildings.map((building) => (
            <li key={building.id}>
              <Card interactive className="h-full">
                <div className="flex items-start justify-between gap-[var(--space-3)]">
                  <div>
                    <h3 className="eco-subhead text-[var(--text-strong)]">{building.name}</h3>
                    <p className="mt-[var(--space-1)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
                      {building.address}
                    </p>
                  </div>
                  <EnergyGradeBadge grade={building.grade} />
                </div>
                <p className="mt-[var(--space-3)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
                  {formatDate(building.savedAt)} 저장 · 검색 위치로부터 {formatDistance(building.distanceMeters)}
                </p>
                <ButtonLink
                  href={`/report/${building.id}`}
                  variant="outline"
                  size="sm"
                  className="mt-[var(--space-4)]"
                >
                  리포트 보기
                </ButtonLink>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-[var(--gap-card)] sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-[var(--space-3)]">
            <Icon name="check" size={20} />
            <h2 className="eco-subhead text-[var(--text-strong)]">신청 내역</h2>
          </div>
          <p className="mt-[var(--space-3)] text-[length:var(--text-body-size)] text-[var(--text-body)]">
            진행 중인 지원사업 신청 <strong className="text-[var(--text-strong)]">{pendingCount}건</strong>을
            포함해 총 {myApplications.length}건의 신청 내역이 있습니다.
          </p>
          <ButtonLink href="/mypage/applications" variant="outline" size="sm" className="mt-[var(--space-4)]">
            신청 내역 보기
          </ButtonLink>
        </Card>

        <Card>
          <div className="flex items-center gap-[var(--space-3)]">
            <Icon name="bell" size={20} />
            <h2 className="eco-subhead text-[var(--text-strong)]">알림</h2>
          </div>
          <p className="mt-[var(--space-3)] text-[length:var(--text-body-size)] text-[var(--text-body)]">
            신청 처리 결과와 등급 갱신 소식을 알림에서 모아볼 수 있습니다.
          </p>
          <ButtonLink href="/mypage/notifications" variant="outline" size="sm" className="mt-[var(--space-4)]">
            알림 보기
          </ButtonLink>
        </Card>
      </div>
    </MypageShell>
  );
}

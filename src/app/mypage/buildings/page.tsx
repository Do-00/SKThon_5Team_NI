import type { Metadata } from "next";
import { EnergyGradeBadge } from "../../../components/domain";
import { ButtonLink, Card } from "../../../components/ui";
import { getSavedBuildings } from "../../../data/buildings";
import { formatDate, formatDistance } from "../../../lib/format";
import { MypageShell } from "../_components/MypageShell";

export const metadata: Metadata = {
  title: "저장한 건물",
};

export default async function MypageBuildingsPage() {
  const savedBuildings = await getSavedBuildings();

  return (
    <MypageShell
      active="buildings"
      title="저장한 건물"
      description="에코체크를 실행하고 저장한 건물 목록입니다."
    >
      {savedBuildings.length === 0 ? (
        <Card className="text-center text-[var(--text-muted)]">저장한 건물이 없습니다.</Card>
      ) : (
        <ul className="grid grid-cols-1 gap-[var(--gap-card)] sm:grid-cols-2">
          {savedBuildings.map((building) => (
            <li key={building.id}>
              <Card interactive className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-[var(--space-3)]">
                  <div>
                    <h2 className="eco-subhead text-[var(--text-strong)]">{building.name}</h2>
                    <p className="mt-[var(--space-1)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
                      {building.address}
                    </p>
                  </div>
                  <EnergyGradeBadge grade={building.grade} showLabel />
                </div>
                <dl className="mt-[var(--space-4)] flex flex-wrap gap-x-[var(--space-6)] gap-y-[var(--space-2)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
                  <div className="flex gap-[var(--space-1)]">
                    <dt>저장일</dt>
                    <dd className="font-medium text-[var(--text-body)]">{formatDate(building.savedAt)}</dd>
                  </div>
                  <div className="flex gap-[var(--space-1)]">
                    <dt>검색 위치와의 거리</dt>
                    <dd className="font-medium text-[var(--text-body)]">{formatDistance(building.distanceMeters)}</dd>
                  </div>
                </dl>
                <ButtonLink href={`/report/${building.id}`} variant="secondary" size="sm" className="mt-auto pt-[var(--space-4)]">
                  에코체크 리포트 보기
                </ButtonLink>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </MypageShell>
  );
}

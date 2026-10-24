import type { Metadata } from "next";
import { EnergyGradeBadge } from "../../../components/domain";
import { searchBuildings } from "../../../data/buildings";
import { formatDistance } from "../../../lib/format";
import { AdminShell } from "../_components/AdminShell";

export const metadata: Metadata = {
  title: "건물 관리",
};

/**
 * Framework screen: the route, sidebar entry, and a first read-only table
 * are in place, but this is deliberately a light scaffold — building
 * management actions (search, filters, bulk export, …) are out of scope
 * for the prototype and are noted as upcoming below.
 */
export default async function AdminBuildingsPage() {
  const { buildings } = await searchBuildings();

  return (
    <AdminShell
      active="buildings"
      title="건물 관리"
      description="에코체크가 실행된 건물 목록입니다. 검색, 필터, 담당자 배정 등은 추후 지원 예정입니다."
    >
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)]">
        <table className="w-full min-w-[640px] border-collapse text-left text-[length:var(--text-body-size)]">
          <caption className="sr-only">에코체크가 실행된 건물 목록</caption>
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
              <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] font-bold">
                건물명
              </th>
              <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] font-bold">
                주소
              </th>
              <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] font-bold">
                등급
              </th>
              <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] font-bold">
                검색 위치와의 거리
              </th>
            </tr>
          </thead>
          <tbody>
            {buildings.map((building) => (
              <tr key={building.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                <th scope="row" className="px-[var(--space-4)] py-[var(--space-3)] font-medium text-[var(--text-strong)]">
                  {building.name}
                </th>
                <td className="px-[var(--space-4)] py-[var(--space-3)] text-[var(--text-body)]">{building.address}</td>
                <td className="px-[var(--space-4)] py-[var(--space-3)]">
                  <EnergyGradeBadge grade={building.grade} size="sm" />
                </td>
                <td className="whitespace-nowrap px-[var(--space-4)] py-[var(--space-3)] text-[var(--text-muted)]">
                  {formatDistance(building.distanceMeters)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
        검색/필터, 담당자 배정, 상세 진단 이력 등은 아직 준비 중인 기능입니다. 이 화면은 향후 기능이 붙을
        자리(framework)만 마련해 둔 프로토타입입니다.
      </p>
    </AdminShell>
  );
}

import { PageSection, SectionHeader, SiteShell } from "@/src/components/layout";
import { ButtonLink, Card, Icon } from "@/src/components/ui";
import type { IconName } from "@/src/components/ui";
import { GradeScale, ProgramCard } from "@/src/components/domain";
import { getEcoCheckReport } from "@/src/data/account";
import { getSupportPrograms } from "@/src/data/programs";
import { HomeHero } from "./_components/HomeHero";
import { pilotSummary } from "@/src/lib/building-registry";

interface Step {
  icon: IconName;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: "map-pin",
    title: "주소를 입력합니다",
    description: "도로명 주소 하나로 건축물대장·공공 데이터를 불러옵니다.",
  },
  {
    icon: "gauge",
    title: "말할 수 있는 만큼 등급을 판단합니다",
    description:
      "인증 등급이 있으면 그대로, 없으면 같은 용도·시기의 인증 건물과 비교해 범위로, 근거가 부족하면 등급 대신 확인된 사실과 실제 사용량을 보여 드려요.",
  },
  {
    icon: "sparkles",
    title: "법령 근거로 개선 방법을 안내합니다",
    description: "AI가 녹색건축법·지원사업 고시에서 근거를 찾아, 건물에 맞는 공사와 이자지원 요건까지 알려 드려요.",
  },
];

export default async function Home() {
  const [report, programs] = await Promise.all([getEcoCheckReport(), getSupportPrograms()]);
  const matchedPrograms = programs.filter((program) => program.matched).slice(0, 2);

  // 숫자는 화면에 적지 않고 데이터에서 계산한다 — 자료가 바뀌면 같이 바뀌게.
  const pilot = pilotSummary();
  const blindSpot = pilot
    ? (() => {
        const sum = (k: "buildings" | "old30" | "certified") => pilot.dongs.reduce((s, d) => s + d[k], 0);
        const buildings = sum("buildings");
        return {
          names: pilot.dongs.map((d) => d.name.split(" ").slice(1).join(" ")).join(" · "),
          buildings,
          oldPct: ((sum("old30") / buildings) * 100).toFixed(1),
          certified: sum("certified"),
          certPct: ((sum("certified") / buildings) * 100).toFixed(2),
        };
      })()
    : null;

  return (
    <SiteShell>
      <HomeHero />

      {/* 인증 사각지대 — 시범 3개 동 건축물대장 실측 */}
      {blindSpot ? (
        <PageSection aria-labelledby="home-blindspot-title">
          <SectionHeader
            id="home-blindspot-title"
            title="대부분의 건물은 에너지 등급이 없습니다"
            hint={`${blindSpot.names} 건축물대장 표제부 전수 분석 (주건축물 기준)`}
          />
          <ul className="mt-[var(--space-5)] grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-3">
            {[
              { value: blindSpot.buildings.toLocaleString("ko-KR"), unit: "동", label: "분석한 건물" },
              { value: blindSpot.oldPct, unit: "%", label: "사용승인 30년이 지난 노후 건물" },
              { value: blindSpot.certPct, unit: "%", label: `에너지효율등급이 있는 건물 (${blindSpot.certified}동)` },
            ].map((stat) => (
              <li key={stat.label}>
                <Card padding="lg" className="flex h-full flex-col gap-1">
                  <p className="font-brand text-[40px] font-black leading-none text-[var(--text-strong)]">
                    {stat.value}
                    <span className="ml-1 text-[20px] text-[var(--text-muted)]">{stat.unit}</span>
                  </p>
                  <p className="text-[17px] font-medium text-[var(--text-body)]">{stat.label}</p>
                </Card>
              </li>
            ))}
          </ul>
        </PageSection>
      ) : null}

      {/* Three steps */}
      <PageSection aria-labelledby="home-steps-title">
        <SectionHeader id="home-steps-title" title="세 단계로 끝납니다" />
        <ol className="mt-[var(--space-5)] grid grid-cols-1 gap-[var(--space-5)] md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Card padding="lg" className="flex h-full flex-col gap-[var(--space-3)]">
                <div className="flex items-center gap-[var(--space-3)]">
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-brand-soft)] text-[var(--teal-700)]"
                  >
                    <Icon name={step.icon} size={30} />
                  </span>
                  <span aria-hidden="true" className="font-brand text-[28px] font-black text-[var(--teal-600)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-brand text-[24px] font-black text-[var(--text-strong)]">{step.title}</h3>
                <p className="text-[length:var(--text-body-lg-size)] font-medium leading-[1.6] text-[var(--text-body)]">
                  {step.description}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      </PageSection>

      {/* Grade scale */}
      <PageSection aria-labelledby="home-scale-title">
        <Card padding="lg" className="flex flex-col gap-[var(--space-4)]">
          <SectionHeader
            id="home-scale-title"
            title="등급 기준표"
            hint="다른 등급을 누르면 연간 단위면적당 1차에너지소요량을 볼 수 있습니다."
          />
          <GradeScale value={report.grade} selectable />
        </Card>
      </PageSection>

      {/* Matched programs */}
      <PageSection aria-labelledby="home-programs-title">
        <SectionHeader id="home-programs-title" title="지금 신청 가능한 지원사업" />
        <div className="mt-[var(--space-5)] grid grid-cols-1 gap-[var(--space-4)] md:grid-cols-2">
          {matchedPrograms.map((program) => (
            <ProgramCard key={program.id} program={program} href="/programs?tag=matched" />
          ))}
        </div>
        <div className="mt-[var(--space-5)] flex justify-center">
          <ButtonLink href="/programs" variant="outline" size="lg" trailingIcon={<Icon name="arrow-right" size={22} />}>
            지원사업 전체 보기
          </ButtonLink>
        </div>
      </PageSection>
    </SiteShell>
  );
}

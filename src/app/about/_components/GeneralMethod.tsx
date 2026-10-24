import { Card, Icon } from "@/src/components/ui";
import type { IconName } from "@/src/components/ui";
import { certSummary, pilotSummary } from "@/src/lib/building-registry";

/**
 * 서비스 소개 — 전체 건축물의 등급 판단 방식.
 *
 * 아파트 모델과 같은 원칙(말할 수 있는 만큼만)을 모든 건물에 적용한다.
 * 숫자는 화면에 적지 않고 데이터 파일에서 계산한다 — 화면과 데이터가 다른 숫자를 말하면 안 된다.
 */

interface Step {
  no: string;
  icon: IconName;
  title: string;
  body: string;
  note?: string;
}

export function GeneralMethod() {
  const certs = certSummary();
  const pilot = pilotSummary();
  const fmt = (n: number) => n.toLocaleString("ko-KR");

  const steps: Step[] = [
    {
      no: "01",
      icon: "search",
      title: "주소로 건축물대장을 찾습니다",
      body: "주소의 법정동코드와 지번으로 건축물대장 표제부를 불러옵니다. 주용도·사용승인일·연면적·구조를 확인하고, 한 지번에 건물이 여럿이면 하나씩 고를 수 있습니다.",
      note: "전국 모든 건물",
    },
    {
      no: "02",
      icon: "badge-check",
      title: "인증 등급이 있으면 그대로 보여 드립니다",
      body: "건축물대장에 에너지효율등급이 적혀 있으면 추정하지 않고 그 등급을 씁니다.",
    },
    {
      no: "03",
      icon: "users",
      title: "없으면 같은 용도·시기의 인증 건물과 비교합니다",
      body: "같은 용도, 사용승인 ±3년, 비슷한 규모로 인증받은 건물을 찾아 등급 분포의 가운데 50%를 범위로 보여 드립니다. 규모 → 지역 순으로만 비교 범위를 넓힙니다.",
      note: certs ? `전국 인증현황 ${fmt(certs.total)}건 (주거 ${fmt(certs.residential)} · 비주거 ${fmt(certs.nonResidential)}, 취소 인증 제외)` : undefined,
    },
    {
      no: "04",
      icon: "triangle-alert",
      title: "비교할 건물이 8곳 미만이면 등급을 말하지 않습니다",
      body: "인증 제도가 자리 잡기 전에 지어진 노후 건물이 대부분 여기에 해당합니다. 등급 대신 노후 정도, 적용 단열 기준, 실제 에너지 사용량처럼 확인된 사실만 보여 드립니다.",
    },
    {
      no: "05",
      icon: "thermometer",
      title: "실제로 쓴 에너지와 비교합니다",
      body: "인증 등급은 설계 기준입니다. 건물에너지정보의 전기·도시가스 사용량으로 같은 동·같은 용도 건물 중 많이 쓰는 편인지 보여 드립니다.",
      note: pilot ? `시범 지역: ${pilot.dongs.map((d) => d.name.split(" ").slice(1).join(" ")).join(" · ")}` : undefined,
    },
  ];

  return (
    <section
      id="general-method"
      aria-label="전체 건축물 등급 판단 방식"
      className="flex scroll-mt-[calc(var(--app-bar-height)+var(--space-6))] flex-col gap-[var(--space-6)]"
    >
      <div className="flex flex-col gap-[var(--space-3)]">
        <h2 className="font-sans text-[26px] font-bold tracking-normal text-[var(--text-strong)]">
          모든 건물은 이렇게 판단합니다
        </h2>
        {pilot ? (
          <p className="text-[19px] leading-[1.7] text-[var(--text-body)]">
            시범 지역 건물{" "}
            <strong className="font-bold text-[var(--text-strong)]">
              {fmt(pilot.dongs.reduce((s, d) => s + d.buildings, 0))}동
            </strong>{" "}
            가운데 에너지효율등급이 있는 건물은{" "}
            <strong className="font-bold text-[var(--text-strong)]">
              {fmt(pilot.dongs.reduce((s, d) => s + d.certified, 0))}동
            </strong>
            뿐이고, 30년이 지난 노후 건물이{" "}
            <strong className="font-bold text-[var(--text-strong)]">
              {(
                (pilot.dongs.reduce((s, d) => s + d.old30, 0) / pilot.dongs.reduce((s, d) => s + d.buildings, 0)) *
                100
              ).toFixed(1)}
              %
            </strong>
            입니다. 그린리모델링이 필요한 건물일수록 등급이 없습니다.
          </p>
        ) : null}
      </div>

      <ol className="flex flex-col gap-[var(--space-3)]">
        {steps.map((s) => (
          <li key={s.no}>
            <Card className="flex h-full items-start gap-[var(--space-4)]">
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-brand-soft)] font-sans text-[17px] font-bold text-[var(--teal-700)]"
              >
                {s.no}
              </span>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Icon name={s.icon} size={20} className="shrink-0 text-[var(--teal-600)]" />
                  <h3 className="font-sans text-[18px] font-bold tracking-normal text-[var(--text-strong)]">{s.title}</h3>
                </div>
                <p className="text-[17px] leading-[1.65] text-[var(--text-body)]">{s.body}</p>
                {s.note ? <p className="text-[15px] font-medium text-[var(--teal-700)]">{s.note}</p> : null}
              </div>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}

import { Badge, Card } from "@/src/components/ui";
import { SectionHeader } from "@/src/components/layout/SectionHeader";
import type { BuildingFacts, ElectricUsage, GasUsage } from "@/src/lib/building-registry";

/**
 * 실제 에너지 사용량 카드 — 국토교통부 건물에너지정보(지번 단위)를 같은 동·같은 용도 건물과 비교한다.
 * 인증 등급은 설계 기준이라, 실제로 얼마나 쓰는지는 이 값으로만 알 수 있다.
 *
 * 전기는 2025년 1년치, 도시가스는 2026년 1~6월이라 기간이 다르다. 그래서 둘을 더해 등급을 매기지 않고,
 * 같은 해 1년치가 모두 있을 때만(totalAnnual) 건물 유형별·규모별 기준표의 A~E 를 보여 준다.
 */

type Tone = "neutral" | "good" | "caution" | "danger";

function standing(percentile: number | null, peerCount: number | null, group: string): { text: string; tone: Tone } {
  if (percentile === null || !peerCount) return { text: "비교할 같은 용도 건물이 10곳 미만이에요", tone: "neutral" };
  const high = 100 - percentile;
  const head = `같은 동 ${group} ${peerCount.toLocaleString("ko-KR")}곳 중 `;
  if (high <= 50) return { text: `${head}많이 쓰는 편 (상위 ${Math.max(1, high)}%)`, tone: high <= 25 ? "danger" : "caution" };
  return { text: `${head}적게 쓰는 편 (하위 ${Math.max(1, percentile)}%)`, tone: "good" };
}

const fmtKwh = (v: number) =>
  v >= 10000 ? `${Math.round(v / 1000).toLocaleString("ko-KR")}MWh` : `${Math.round(v).toLocaleString("ko-KR")}kWh`;

function MonthBars({ values, labels, label }: { values: number[]; labels: string[]; label: string }) {
  const max = Math.max(...values, 1);
  return (
    <ul aria-label={label} className="flex items-end gap-1">
      {values.map((v, i) => (
        <li key={labels[i]} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${labels[i]} ${fmtKwh(v)}`}>
          <span
            aria-hidden
            className="block w-full rounded-t-[var(--radius-sm)] bg-[var(--teal-500)]"
            style={{ height: `${Math.max(3, Math.round((v / max) * 80))}px` }}
          />
          <span className="text-[12px] text-[var(--text-muted)]">{labels[i]}</span>
          <span className="sr-only">{fmtKwh(v)}</span>
        </li>
      ))}
    </ul>
  );
}

const GRADE_TEXT: Record<NonNullable<BuildingFacts["usageGrade"]>, string> = {
  A: "같은 유형·규모에서 가장 적게 쓰는 수준",
  B: "적게 쓰는 편",
  C: "보통",
  D: "많이 쓰는 편",
  E: "가장 많이 쓰는 수준 — 개선 효과가 클 가능성이 큽니다",
};

export function EnergyUsageCard({
  gas,
  electric,
  usageGrade,
  totalAnnual,
  group,
}: {
  gas: GasUsage | null;
  electric: ElectricUsage | null;
  usageGrade: BuildingFacts["usageGrade"];
  totalAnnual: number | null;
  group: string;
}) {
  const elecStanding = electric ? standing(electric.percentile, electric.peerCount, group) : null;
  const gasStanding = gas ? standing(gas.percentile, gas.peerCount, group) : null;

  return (
    <Card padding="lg" className="flex flex-col gap-[var(--space-5)]">
      <SectionHeader
        title="실제 에너지 사용량"
        hint="국토교통부 건물에너지정보의 실제 사용량이에요. 인증 등급은 설계 기준이라, 실제로 얼마나 쓰는지는 이 값으로 봐요."
        hintSize="sm"
      />

      {/* 제안서와 맞춤: 실사용 A~E 글자는 법적 등급으로 오해될 수 있어 화면에 쓰지 않는다 */}

      {electric ? (
        <section className="flex flex-col gap-[var(--space-2)]">
          <div className="flex flex-wrap items-baseline gap-[var(--space-3)]">
            <h3 className="text-[17px] font-black text-[var(--text-strong)]">전기 · {electric.year}년 1년</h3>
            <p className="font-brand text-[28px] font-black text-[var(--text-strong)]">
              {electric.annual.toLocaleString("ko-KR")}
              <span className="ml-1 text-[15px] font-bold text-[var(--text-muted)]">kWh/㎡·yr</span>
            </p>
          </div>
          {elecStanding ? <Badge tone={elecStanding.tone}>{elecStanding.text}</Badge> : null}
          {electric.peerMedian !== null ? (
            <p className="text-[16px] text-[var(--text-body)]">
              같은 동 {group}의 가운데값은 {electric.peerMedian.toLocaleString("ko-KR")} kWh/㎡·yr예요.
            </p>
          ) : null}
          {electric.months.length === 12 ? (
            <MonthBars
              values={electric.months}
              labels={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]}
              label={`${electric.year}년 월별 전기 사용량`}
            />
          ) : null}
        </section>
      ) : null}

      {gas ? (
        <section className="flex flex-col gap-[var(--space-2)]">
          <div className="flex flex-wrap items-baseline gap-[var(--space-3)]">
            <h3 className="text-[17px] font-black text-[var(--text-strong)]">도시가스 · 2026년 1~6월</h3>
            <p className="font-brand text-[28px] font-black text-[var(--text-strong)]">
              {gas.intensity.toLocaleString("ko-KR")}
              <span className="ml-1 text-[15px] font-bold text-[var(--text-muted)]">kWh/㎡</span>
            </p>
          </div>
          {gasStanding ? <Badge tone={gasStanding.tone}>{gasStanding.text}</Badge> : null}
          {gas.months.length === 6 ? (
            <MonthBars values={gas.months} labels={["1월", "2월", "3월", "4월", "5월", "6월"]} label="월별 도시가스 사용량" />
          ) : null}
        </section>
      ) : null}

      <p className="text-[14px] leading-relaxed text-[var(--text-muted)]">
        필지(지번) 단위 사용량을 그 필지의 연면적으로 나눈 값이라, 한 필지에 건물이 여럿이면 함께 계산돼요.
        
      </p>
    </Card>
  );
}

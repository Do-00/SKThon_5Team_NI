"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { EnergyGradeBadge } from "@/src/components/domain/EnergyGradeBadge";
import { getGradeColorVars, getGradeOnColor } from "@/src/components/domain/grade-tokens";
import { SectionHeader } from "@/src/components/layout/SectionHeader";
import { Badge, ButtonLink, Card, Icon, Tab, TabList, TabPanel, Tabs } from "@/src/components/ui";
import type { IconName } from "@/src/components/ui";
import { PRIMARY_ENERGY_UNIT, type GradeCode } from "@/src/data/grades";
import { formatManwon, formatNumber, formatPercent, formatTonsCO2 } from "@/src/lib/format";
import { useWhatIfProjection } from "../_lib/use-what-if-projection";
import { ReportActions } from "./ReportActions";

/** Basis rows this projection can override once beec returns an "개선 후" result — see `page.tsx`'s `buildLiveBasisRows`. */
const PROJECTABLE_BASIS_LABELS = new Set(["에너지 등급", "1차에너지소요량"]);

export interface BasisRow {
  icon: IconName;
  label: string;
  value: string;
}

export interface ReportMetrics {
  annualEnergyCostManwon: number;
  percentileRank: number;
  annualCarbonEmissionTons: number;
  annualSavingsPotentialManwon: number;
}

export interface ReportOverviewProps {
  buildingId: string;
  buildingName: string;
  /** e.g. `"1998년 준공 · 공동주택 · 84㎡"`. */
  metaLine: string;
  address: string;
  completionYear: number;
  useType: string;
  primaryEnergyKwh: number;
  grade: GradeCode;
  isEstimated: boolean;
  /**
   * 신뢰도 게이트가 추정을 거절한 건물. `grade`는 자리만 채운 값이라 화면에 내면 안 된다 —
   * 등급 대신 회색 「?」 배지를 보여 준다.
   */
  gradeUnknown?: boolean;
  /** 배지 아래 문구를 바꿀 때, 예: "추정 범위 1+~1등급". 없으면 인증/추정 등급. */
  gradeCaption?: string;
  basisRows: BasisRow[];
  /** Detailed report figures; `null` for buildings without a full report fixture. */
  metrics: ReportMetrics | null;
}

/** Active tab takes the building's grade color, with a text color that stays legible on it. */
const TAB_CLASS =
  "flex-1 aria-selected:bg-[var(--tab-accent)] aria-selected:font-bold aria-selected:text-[var(--tab-accent-fg)]";

/**
 * Client island for the top of the report: the grade card (with the
 * 현재/개선 후 tabs and share/save actions) beside the metrics and the
 * public-data basis. One `Tabs` wraps both columns so the tab list in the
 * left card drives the panels on the right.
 */
export function ReportOverview({
  buildingId,
  buildingName,
  metaLine,
  address,
  completionYear,
  useType,
  primaryEnergyKwh,
  grade,
  isEstimated,
  gradeUnknown = false,
  gradeCaption,
  basisRows,
  metrics,
}: ReportOverviewProps) {
  const [view, setView] = useState<"now" | "after">("now");
  const { actionCount, result: projection } = useWhatIfProjection(primaryEnergyKwh, useType, grade);
  const showingProjection = view === "after" && projection !== null;
  const displayGrade = showingProjection ? projection.projectedGrade : grade;

  const accentStyle = {
    "--tab-accent": `var(${getGradeColorVars(displayGrade).color})`,
    "--tab-accent-fg": getGradeOnColor(displayGrade),
  } as CSSProperties;

  /**
   * 라벨을 실제 계산 내용에 맞춥니다.
   *
   * 「연간 난방비」 였는데, 이 값의 출처인 1차에너지소요량은 한국에너지공단 평가방법상
   * 난방·냉방·급탕·조명·환기를 **모두 합한** 값입니다. 난방은 그중 일부(국내 아파트 기준 절반 남짓)라
   * 난방비라고 부르면 두 배 가까이 부풀려 말하는 셈이 됩니다. → 「연간 에너지 비용」
   *
   * 「절감 여지」 도 마찬가지입니다. 계산식이 (현재값 − 60) ÷ 현재값 인데 60은 1+++등급 상한,
   * 즉 패시브 수준입니다. 사용자가 할 수 있는 개선이 아니라 "재건축했을 때의 이론적 최대" 라서
   * 아래 «권장 조치를 모두 실천하면 N만원 절감» 과 전혀 다른 것을 가리킵니다. → 「개선 여력」
   *
   * 수식 자체를 바로잡으려면 1차에너지환산계수를 걷어내고 용도별로 분해해야 하는데,
   * 그건 고시 별표를 확인해야 하는 작업이라 다음 단계로 남겨 둡니다.
   * 지금은 최소한 **이름이 내용과 어긋나지 않게** 합니다.
   */
  const metricCards: { icon: IconName; label: string; value: string }[] = metrics
    ? [
        { icon: "thermometer", label: "연간 에너지 비용", value: formatManwon(metrics.annualEnergyCostManwon) },
        { icon: "trending-down", label: "개선 여력", value: formatPercent(metrics.percentileRank) },
        { icon: "droplet", label: "연간 탄소 배출", value: formatTonsCO2(metrics.annualCarbonEmissionTons) },
      ]
    : [];

  const displayBasisRows = showingProjection
    ? basisRows.map((row) => {
        if (!PROJECTABLE_BASIS_LABELS.has(row.label)) return row;
        if (row.label === "에너지 등급") return { ...row, value: `${projection.projectedGrade}등급` };
        return { ...row, value: `${formatNumber(projection.projectedPrimaryEnergyKwh)} ${PRIMARY_ENERGY_UNIT}` };
      })
    : basisRows;

  return (
    <Tabs
      value={view}
      onValueChange={(next) => setView(next as "now" | "after")}
      className="grid grid-cols-1 items-start gap-[var(--space-6)] lg:grid-cols-[420px_minmax(0,1fr)]"
    >
      <Card padding="lg" className="flex flex-col items-center gap-[var(--space-6)]" style={accentStyle}>
        <div className="text-center">
          <h1 className="font-brand text-[24px] font-black leading-[1.3] text-[var(--text-strong)]">{buildingName}</h1>
          <p className="mt-[var(--space-1)] text-[16px] text-[var(--text-muted)]">{metaLine}</p>
          <p className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">{address}</p>
        </div>

        {gradeUnknown && !showingProjection ? (
          // EnergyGradeBadge size="lg"와 같은 크기의 회색 배지 — 등급을 말하지 않는다는 것 자체가 결과다.
          <span className="inline-flex shrink-0 flex-col items-center gap-[var(--space-2)]">
            <span className="flex h-[116px] w-[116px] items-center justify-center rounded-[var(--radius-lg)] border-[3px] border-[var(--ink-300)] bg-[var(--surface-sunken)] font-brand text-[64px] font-black leading-none text-[var(--ink-400)]">
              <span aria-hidden="true">?</span>
              <span className="sr-only">등급 추정 보류</span>
            </span>
            <span className="whitespace-nowrap text-[length:var(--text-caption-size)] font-medium text-[var(--text-muted)]">
              추정 보류
            </span>
          </span>
        ) : (
          <EnergyGradeBadge
            grade={displayGrade}
            size="lg"
            caption={showingProjection ? "개선 후 예상 등급" : (gradeCaption ?? (isEstimated ? "추정 등급" : "인증 등급"))}
          />
        )}

        {metrics ? (
          <TabList aria-label="성적표 시점 선택" className="w-full">
            <Tab value="now" className={TAB_CLASS}>
              현재
            </Tab>
            <Tab value="after" className={TAB_CLASS}>
              개선 후
            </Tab>
          </TabList>
        ) : null}

        <div className="flex w-full flex-col gap-[var(--space-2)]">
          <ReportActions
            buildingId={buildingId}
            buildingName={buildingName}
            address={address}
            completionYear={completionYear}
            useType={useType}
            grade={grade}
            isEstimated={isEstimated}
            primaryEnergyKwh={primaryEnergyKwh}
            annualSavingsPotentialManwon={metrics?.annualSavingsPotentialManwon ?? null}
          />
          <p className="text-center text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
            저장하려면 로그인이 필요해요
          </p>
        </div>
      </Card>

      <div className="flex min-w-0 flex-col gap-[var(--space-5)]">
        {metrics ? (
          <>
            <TabPanel value="now" className="focus:outline-none">
              <ul aria-label="현재 에너지 지표" className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-3">
                {metricCards.map((metric) => (
                  <li key={metric.label}>
                    <Card className="flex h-full flex-col gap-1.5">
                      <Icon name={metric.icon} size={26} className="text-[var(--teal-600)]" />
                      <p className="text-[16px] text-[var(--text-muted)]">{metric.label}</p>
                      <p className="whitespace-nowrap font-brand text-[28px] font-black text-[var(--text-strong)]">
                        {metric.value}
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>

              {/*
                위 세 숫자는 공공데이터에 적힌 값이 아니라 계산값입니다.
                그리고 계산식에 알려진 한계가 셋 있습니다(용도 혼합 · 1차에너지 과대 · 이론적 최대).
                숨기면 "난방비를 부풀렸다" 가 되고, 적어 두면 "근사치임을 밝힌 것" 이 됩니다.
                발표에서 먼저 말할 내용이기도 하니 화면에도 그대로 적습니다.
              */}
              <details className="mt-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-4 py-3">
                <summary className="cursor-pointer text-[length:var(--text-caption-size)] font-bold text-[var(--text-body)]">
                  이 숫자는 어떻게 계산했나요?
                </summary>

                <div className="mt-[var(--space-3)] flex flex-col gap-[var(--space-3)] text-[length:var(--text-caption-size)] leading-[1.7] text-[var(--text-muted)]">
                  <p>
                    세 값 모두 <strong className="font-bold text-[var(--text-body)]">1차에너지소요량</strong>에
                    평균 단가(110원/kWh)와 난방 방식별 온실가스 배출계수를 곱해 계산한 추정치입니다. 공공데이터에
                    그대로 적혀 있는 값이 아닙니다.
                  </p>

                  <ul className="flex flex-col gap-2">
                    <li className="flex gap-2">
                      <span aria-hidden className="text-[var(--teal-600)]">·</span>
                      <span>
                        <strong className="font-bold text-[var(--text-body)]">난방비가 아니라 전체 에너지 비용입니다.</strong>{" "}
                        1차에너지소요량은 난방·냉방·급탕·조명·환기를 모두 합한 값이라, 난방만 따로 떼면 이보다
                        작습니다.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span aria-hidden className="text-[var(--teal-600)]">·</span>
                      <span>
                        <strong className="font-bold text-[var(--text-body)]">실제 고지서보다 크게 나옵니다.</strong>{" "}
                        1차에너지는 발전·수송 손실까지 거슬러 올라간 값이고, 요금은 최종 소비 에너지 기준으로
                        부과됩니다.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span aria-hidden className="text-[var(--teal-600)]">·</span>
                      <span>
                        <strong className="font-bold text-[var(--text-body)]">개선 여력은 이론적 최대입니다.</strong>{" "}
                        최고 등급(1+++) 수준까지 낮췄을 때를 가정한 값이라, 실제로 실천 가능한 절감액은 아래
                        「권장 조치」 쪽 숫자를 보세요.
                      </span>
                    </li>
                  </ul>

                  <p>
                    용도별로 나누고 1차에너지 환산을 걷어내는 작업은 다음 단계 과제입니다. 지금은 건물 간 비교와
                    규모 감을 잡는 용도로만 봐 주세요.
                  </p>
                </div>
              </details>
            </TabPanel>

            <TabPanel value="after" className="focus:outline-none">
              {projection ? (
                <Card tone="brand" padding="lg" className="flex flex-col gap-[var(--space-3)]">
                  <div className="flex items-center justify-between gap-[var(--space-2)]">
                    <h2 className="eco-subhead text-[var(--teal-800)]">
                      추천 절감 항목 {actionCount}개를 모두 적용하면
                    </h2>
                    <Badge tone={projection.source === "beec" ? "good" : "caution"}>
                      {projection.source === "beec" ? "실시간 계산" : "추정치"}
                    </Badge>
                  </div>
                  <p className="text-[length:var(--text-body-size)] text-[var(--text-body)]">
                    1차에너지소요량 {formatNumber(projection.currentPrimaryEnergyKwh)} →{" "}
                    {formatNumber(projection.projectedPrimaryEnergyKwh)} {PRIMARY_ENERGY_UNIT} (▼
                    {projection.reductionPercent}%)
                  </p>
                  <p className="text-[length:var(--text-body-size)] text-[var(--text-body)]">
                    적용 후 예상 등급{" "}
                    <strong className="text-[var(--teal-700)]">{projection.projectedGrade}등급</strong>
                    {" · "}
                    예상 절감액 월{" "}
                    <strong className="text-[var(--teal-700)]">
                      {formatManwon(projection.totalMonthlySavingsManwon)}
                    </strong>
                  </p>
                  <p className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
                    실제 등급({grade}등급)을 기준으로, 추천 조치를 모두 실천했을 때의 예상 절감 효과만큼 등급을
                    추정한 값이에요.
                  </p>
                  <ButtonLink
                    href={`/guide/${buildingId}`}
                    variant="outline"
                    className="self-start"
                    trailingIcon={<Icon name="arrow-right" size={20} />}
                  >
                    절감 하기에서 항목별로 보기
                  </ButtonLink>
                </Card>
              ) : (
                <Card tone="brand" padding="lg" className="flex flex-col gap-[var(--space-3)]">
                  <h2 className="eco-subhead text-[var(--teal-800)]">개선 후 등급을 계산하고 있어요</h2>
                  <p className="text-[length:var(--text-body-size)] text-[var(--text-body)]">
                    추천 절감 항목을 모두 적용했을 때의 등급과 1차에너지소요량을 곧 보여 드려요.
                  </p>
                </Card>
              )}
            </TabPanel>
          </>
        ) : null}

        <Card padding="lg">
          <SectionHeader
            as="h2"
            title="건물 정보"
            hint={showingProjection ? "개선 후 예상치" : "공공 데이터 기반"}
          />
          {/*
            오른쪽 칸 폭이 좁은 lg 구간은 한 줄에 한 항목만 둡니다. 「그룹 대표 1차에너지소요량」처럼
            라벨이 길면 값이 들어갈 자리가 없어 잘리므로, 한 줄에 안 들어가면 값이 다음 줄로 내려갑니다.
          */}
          <dl className="mt-[var(--space-5)] grid grid-cols-1 gap-x-[var(--space-8)] gap-y-[var(--space-4)] md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {displayBasisRows.map((row) => (
              <div
                key={row.label}
                className="flex min-h-12 min-w-0 flex-wrap items-center justify-between gap-x-[var(--space-3)] gap-y-[var(--space-1)] border-b border-[var(--border-subtle)] pb-[var(--space-2)]"
              >
                <dt className="flex min-w-0 items-center gap-[var(--space-3)] break-keep text-[17px] text-[var(--text-body)]">
                  <Icon name={row.icon} size={22} className="shrink-0 text-[var(--text-muted)]" />
                  {row.label}
                </dt>
                <dd className="ml-auto min-w-0 break-keep text-right text-[17px] font-bold text-[var(--text-strong)]">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          {metrics && view === "after" && !projection ? (
            <p className="mt-[var(--space-4)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
              위 값은 현재 기준 데이터예요 — 개선 후 예상 등급·수치를 계산하는 중이에요.
            </p>
          ) : null}
        </Card>
      </div>
    </Tabs>
  );
}

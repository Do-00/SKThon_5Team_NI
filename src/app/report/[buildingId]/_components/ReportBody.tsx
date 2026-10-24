"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AiLawAdvisor } from "@/src/components/domain/AiLawAdvisor";
import { AiRemodelReport, type AiRemodelReportProps } from "@/src/components/domain/AiRemodelReport";
import type { AdvisorBuilding } from "@/src/lib/law-advisor";
import { Badge, ButtonLink, Card, Icon } from "@/src/components/ui";
import { getExampleEnergyCost } from "@/src/data/energy-cost";
import { fetchEnergyCost } from "@/src/lib/eco-api";
import { formatManwon } from "@/src/lib/format";
import { ReportOverview, type ReportMetrics, type ReportOverviewProps } from "./ReportOverview";

export interface ReportBodyProps {
  overview: Omit<ReportOverviewProps, "metrics">;
  /** Gemini 리모델링 리포트 입력 — `metrics`는 이 컴포넌트가 채운다. */
  remodel: Omit<AiRemodelReportProps, "metrics">;
  /** Fixture figures, for the one building that has a full report fixture. */
  initialMetrics: ReportMetrics | null;
  /**
   * Live beec matches and estimates have no figures server-side, so fetch the
   * example ones from `/api/energy-cost` in the browser, where MSW answers it
   * — or fall back to the same example table when MSW isn't running.
   */
  fetchLiveMetrics: boolean;
  /**
   * 연면적(㎡).
   *
   * 연간 에너지 비용·탄소 배출은 1차에너지소요량 × 연면적으로 계산합니다.
   * 등급만 보고 고정표를 읽으면 같은 등급의 30평과 60평이 같은 숫자를 받습니다.
   */
  areaSqm: number;
  /**
   * "개별난방" · "지역난방" · "중앙난방".
   *
   * 탄소 배출 계산에 씁니다. 넘기지 않으면 전력 배출계수로 계산되는데,
   * 이 서비스가 다루는 아파트의 68%가 도시가스 개별난방이라
   * 생략하면 배출량이 두 배 넘게 부풀려집니다.
   */
  heatingType?: string;
  /**
   * 신뢰도 게이트가 추정을 거절한 경우. 비용·탄소 같은 파생 숫자는 1차에너지소요량이
   * 없으면 만들 수 없으므로, 그 자리에 거절 사유와 확인된 사실을 보여 준다.
   */
  refusal?: { reason?: string; points: string[] } | null;
  /** 검색형 AI 상담에 넘길 건물 정보. 없으면 상담 카드를 그리지 않는다. */
  advisor?: AdvisorBuilding;
  /**
   * 개요(등급·건물 정보) 바로 아래에 둘 카드. 비주거 건물은 설계 기준 등급보다 실제로 쓴 에너지가
   * 더 중요한 정보라, 실사용량 카드를 AI 리포트보다 먼저 보여 준다.
   */
  afterOverview?: ReactNode;
  /** Rendered between the AI remodel report and the savings card (the grade scale). */
  children?: ReactNode;
}

/**
 * Client part of the report page that owns the figures: fixture metrics are
 * passed straight through, live matches fetch theirs first. The AI remodel
 * report and the savings card wait for that fetch so they're generated from
 * the real figures rather than flashing the "준비 중" state.
 */
export function ReportBody({
  overview,
  remodel,
  initialMetrics,
  fetchLiveMetrics,
  areaSqm,
  heatingType,
  refusal = null,
  advisor,
  afterOverview,
  children,
}: ReportBodyProps) {
  const [metrics, setMetrics] = useState<ReportMetrics | null>(initialMetrics);
  const [ready, setReady] = useState(!fetchLiveMetrics);
  // AI 리모델링 리포트의 연간 절감 고정비. `undefined` = 아직 받는 중, `null` = 리포트가 계산하지 못함.
  const [remodelSavings, setRemodelSavings] = useState<number | null | undefined>(undefined);
  const { grade, primaryEnergyKwh, buildingId } = overview;

  useEffect(() => {
    if (!fetchLiveMetrics) return;
    let cancelled = false;
    fetchEnergyCost(grade, primaryEnergyKwh, areaSqm, heatingType)
      .then((data) => {
        if (!cancelled) setMetrics(data);
      })
      .catch(() => {
        // MSW isn't running (service worker blocked, production build) — use the figures it would have served.
        if (!cancelled) setMetrics(getExampleEnergyCost(grade));
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchLiveMetrics, grade, primaryEnergyKwh, areaSqm, heatingType]);

  return (
    <>
      <ReportOverview {...overview} metrics={metrics} />

      {afterOverview}

      {ready ? (
        <AiRemodelReport
          {...remodel}
          metrics={metrics}
          onResult={(result) => setRemodelSavings(result.data.annualSavingsManwon)}
        />
      ) : null}

      {/* 추정 보류 단지도 상담은 받을 수 있다 — 등급 대신 법령·지원 요건으로 다음 행동을 안내한다. */}
      {advisor ? <AiLawAdvisor building={advisor} /> : null}

      {children}

      {!ready ? null : metrics ? (
        <Card
          tone="brand"
          padding="lg"
          className="flex flex-col items-start gap-[var(--space-5)] sm:flex-row sm:items-center"
        >
          <Icon name="coins" size={36} className="shrink-0 text-[var(--teal-700)]" />
          <div className="flex-1">
            <p className="text-[17px] text-[var(--teal-800)]">권장 조치를 모두 실천하면 연간</p>
            {remodelSavings === undefined ? (
              <div
                aria-label="절감액 계산 중"
                className="mt-[var(--space-1)] h-10 w-40 animate-pulse rounded bg-[var(--teal-100)]"
              />
            ) : (
              <p className="font-brand text-[34px] font-black leading-tight text-[var(--teal-700)]">
                {formatManwon(remodelSavings ?? metrics.annualSavingsPotentialManwon)} 절감
              </p>
            )}
          </div>
          <ButtonLink href={`/guide/${buildingId}`} size="lg" trailingIcon={<Icon name="arrow-right" size={22} />}>
            절감 하기 보기
          </ButtonLink>
        </Card>
      ) : refusal ? (
        <Card tone="sunken" padding="lg" className="flex flex-col items-start gap-[var(--space-4)]">
          <Badge tone="caution">등급 추정 보류</Badge>
          <div className="flex flex-col gap-[var(--space-2)]">
            <h2 className="eco-heading">이 건물은 등급을 말하지 않습니다</h2>
            <p className="max-w-[var(--width-reading)] text-[length:var(--text-body-size)] text-[var(--text-muted)]">
              같은 시기에 지어진 건물의 인증·검증 사례가 부족해, 등급을 말하면 한 칸 이상 틀릴 수 있어요. 틀릴 수
              있는 등급 대신 확인된 사실만 보여 드려요.
              {refusal.reason ? ` (사유: ${refusal.reason})` : ""}
            </p>
          </div>
          {refusal.points.length > 0 ? (
            <ul className="flex flex-col gap-[var(--space-2)] text-[length:var(--text-body-size)] text-[var(--text-body)]">
              {refusal.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span aria-hidden className="text-[var(--teal-600)]">·</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-[var(--space-3)]">
            <ButtonLink href={`/guide/${buildingId}`} variant="primary">
              개선 방법 보기
            </ButtonLink>
            <ButtonLink href="/programs" variant="ghost">
              지원사업 보기
            </ButtonLink>
          </div>
        </Card>
      ) : (
        <Card tone="sunken" padding="lg" className="flex flex-col items-start gap-[var(--space-4)]">
          <Badge tone="brand">프로토타입 안내</Badge>
          <div className="flex flex-col gap-[var(--space-2)]">
            <h2 className="eco-heading">이 건물의 상세 성적표는 준비 중이에요</h2>
            <p className="max-w-[var(--width-reading)] text-[length:var(--text-body-size)] text-[var(--text-muted)]">
              현재 프로토타입에는 이 건물의 난방비·탄소 배출·주변 비교 데이터가 아직 연결되지 않았어요. 등급과 건물
              특성은 위에서 확인할 수 있고, 절감 하기는 바로 이용할 수 있어요.
            </p>
          </div>
          <div className="flex flex-wrap gap-[var(--space-3)]">
            <ButtonLink href={`/guide/${buildingId}`} variant="primary">
              절감 하기 보기
            </ButtonLink>
            <ButtonLink href="/search" variant="ghost">
              다른 건물 검색하기
            </ButtonLink>
          </div>
        </Card>
      )}
    </>
  );
}

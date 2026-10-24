"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { EnergyGradeBadge } from "@/src/components/domain/EnergyGradeBadge";
import { Card, Icon } from "@/src/components/ui";
import { PRIMARY_ENERGY_UNIT } from "@/src/data/grades";
import { formatManwon, formatNumber } from "@/src/lib/format";
import {
  computeLocalReference,
  currentStateOf,
  fallbackRemodelReport,
  type RemodelReportInput,
  type RemodelReportResult,
} from "@/src/lib/remodel-report";

export interface AiRemodelReportProps extends RemodelReportInput {
  /** 리포트를 받았을 때(폴백 포함) 호출 — 성적표 맨 아래 절감액 카드가 같은 숫자를 쓰도록. */
  onResult?: (result: RemodelReportResult) => void;
}

/** 리포트 글자는 가독성을 위해 전부 17px 이상, Black(900) 하나만 쓴다. */
const TEXT = "text-[17px] font-black leading-relaxed";
const STAT_VALUE = "font-brand text-[22px] font-black leading-tight text-[var(--text-strong)]";
const STAT_CAPTION = `${TEXT} text-[var(--text-muted)]`;

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--surface-card)] p-[var(--space-4)]">
      <p className={STAT_CAPTION}>{label}</p>
      {children}
    </li>
  );
}

/**
 * Gemini 리모델링 리포트 카드 — 예전 "AI 한마디"와 같은 디자인. 마운트 시
 * `/api/remodel-report`에 건물 원본 데이터와 사용자 입력 정보를 보내고, 받은
 * `data`(개선 후 등급·소요량·연간 절감 고정비)와 `report`(10~13줄)를 보여준다.
 * 네트워크가 실패하면 서버와 같은 규칙 기반 리포트를 바로 쓴다.
 */
export function AiRemodelReport({ onResult, ...input }: AiRemodelReportProps) {
  // `result === null` doubles as the loading flag, same as the old AI comment card.
  const [result, setResult] = useState<RemodelReportResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    const deliver = (next: RemodelReportResult) => {
      if (cancelled) return;
      setResult(next);
      onResult?.(next);
    };
    const fallback = () => fallbackRemodelReport(input, computeLocalReference(currentStateOf(input)));

    fetch("/api/remodel-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`status ${res.status}`))))
      .then((data: RemodelReportResult) => deliver(data?.data && Array.isArray(data.report) ? data : fallback()))
      .catch(() => deliver(fallback()));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.buildingId, input.grade, input.primaryEnergyKwh]);

  const data = result?.data;

  return (
    <Card tone="brand" padding="lg" className="flex items-start gap-[var(--space-4)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--teal-600)] text-white">
        <Icon name="sparkles" size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
          <p className={`${TEXT} text-[var(--teal-700)]`}>AI 리모델링 리포트 · Gemini</p>
          {result?.source === "fallback" ? (
            <span className={`rounded-[var(--radius-pill)] bg-[var(--surface-sunken)] px-[var(--space-3)] ${TEXT} text-[var(--text-body)]`}>
              규칙 기반
            </span>
          ) : null}
        </div>
        <h2 className="mt-[var(--space-1)] text-[20px] font-black leading-relaxed text-[var(--text-strong)]">
          추천 리모델링 6가지를 모두 적용하면
        </h2>

        {!result || !data ? (
          <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-3)]" aria-busy="true">
            <div className="grid grid-cols-1 gap-[var(--space-3)] sm:grid-cols-3">
              {[0, 1, 2].map((key) => (
                <div key={key} className="h-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--teal-100)]" />
              ))}
            </div>
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="h-6 w-full animate-pulse rounded bg-[var(--teal-100)]" />
            ))}
          </div>
        ) : (
          <>
            <ul aria-label="리모델링 후 예상 수치" className="mt-[var(--space-4)] grid grid-cols-1 gap-[var(--space-3)] sm:grid-cols-3">
              <Stat label="에너지 등급">
                {data.projectedGrade ? (
                  <div className="flex items-center gap-[var(--space-2)]">
                    <EnergyGradeBadge grade={data.currentGrade} size="sm" />
                    <Icon name="arrow-right" size={20} className="shrink-0 text-[var(--teal-700)]" />
                    <EnergyGradeBadge grade={data.projectedGrade} size="sm" />
                  </div>
                ) : (
                  <p className={STAT_VALUE}>계산 보류</p>
                )}
              </Stat>
              <Stat label="1차에너지소요량">
                {data.currentPrimaryEnergyKwh !== null && data.projectedPrimaryEnergyKwh !== null ? (
                  <p className={STAT_VALUE}>
                    {formatNumber(data.currentPrimaryEnergyKwh)} → {formatNumber(data.projectedPrimaryEnergyKwh)}
                  </p>
                ) : (
                  <p className={STAT_VALUE}>▼{data.reductionPercent}%</p>
                )}
                <p className={STAT_CAPTION}>
                  {data.projectedPrimaryEnergyKwh !== null
                    ? `${PRIMARY_ENERGY_UNIT} · ▼${data.reductionPercent}%`
                    : "리모델링 후 감소율"}
                </p>
              </Stat>
              <Stat label="연간 절감 고정비">
                {data.annualSavingsManwon !== null ? (
                  <p className={`${STAT_VALUE} text-[var(--teal-700)]`}>연 {formatManwon(data.annualSavingsManwon)}</p>
                ) : (
                  <p className={STAT_VALUE}>계산 보류</p>
                )}
                {data.annualEnergyCostManwon !== null && data.annualSavingsManwon !== null ? (
                  <p className={STAT_CAPTION}>연간 난방비 {formatManwon(data.annualEnergyCostManwon)} 기준</p>
                ) : null}
              </Stat>
            </ul>

            {data.currentBasis === "ai" && data.currentPrimaryEnergyKwh !== null ? (
              <p className={`mt-[var(--space-2)] ${STAT_CAPTION}`}>
                인증·모델 데이터가 없어 현재 1차에너지소요량({formatNumber(data.currentPrimaryEnergyKwh)} {PRIMARY_ENERGY_UNIT})은
                AI가 건물 정보로 추정한 값이에요.
              </p>
            ) : data.currentBasis === "band" ? (
              <p className={`mt-[var(--space-2)] ${STAT_CAPTION}`}>
                현재 1차에너지소요량은 통계로 추정한 등급 구간의 중간값이에요.
              </p>
            ) : null}

            <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-2)]">
              {result.report.map((line, index) => (
                <p key={index} className={`${TEXT} text-[var(--text-body)]`}>
                  {line}
                </p>
              ))}
            </div>

            <p className={`mt-[var(--space-4)] ${STAT_CAPTION}`}>
              국토부·정책브리핑 등의 부위별 절감률과 이 건물 데이터를 바탕으로 예측한 값이에요. 실제 효과는 시공 조건에
              따라 달라질 수 있어요.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}

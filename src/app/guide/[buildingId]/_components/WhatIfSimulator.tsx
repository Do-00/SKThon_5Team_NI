"use client";

import { Badge, ButtonLink, Card, Icon } from "@/src/components/ui";
import { EnergyGradeBadge } from "@/src/components/domain";
import type { WhatIfResult } from "@/src/lib/what-if";
import { formatManwon, formatNumber } from "@/src/lib/format";

export interface WhatIfSimulatorProps {
  buildingId: string;
  result: WhatIfResult;
  selectedCount: number;
}

/**
 * What-if 시뮬레이터 카드: 체크한 실천 항목을 적용하면 등급/1차에너지소요량이
 * 어떻게 바뀌는지 보여준다. beec의 실제 `/api/simulate`가 응답하면 그 값을
 * 쓰고("실시간 계산" 배지), beec를 못 부르거나 체크한 항목이 beec의 6개
 * measure에 하나도 안 걸리면 `src/lib/what-if.ts`의 로컬 추정치로 대체한다
 * ("데모용 추정치" 배지로 구분).
 */
export function WhatIfSimulator({ buildingId, result, selectedCount }: WhatIfSimulatorProps) {
  const {
    currentGrade,
    projectedGrade,
    currentPrimaryEnergyKwh,
    projectedPrimaryEnergyKwh,
    reductionPercent,
    totalMonthlySavingsManwon,
    source,
  } = result;
  const improved = selectedCount > 0 && projectedGrade !== currentGrade;

  return (
    <Card tone="brand" padding="lg" className="flex flex-col gap-[var(--space-4)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
        <div className="flex items-center gap-[var(--space-2)]">
          <Icon name="gauge" size={22} className="text-[var(--teal-700)]" />
          <h2 className="eco-heading">What-if 시뮬레이터</h2>
        </div>
        {selectedCount > 0 ? (
          <Badge tone={source === "beec" ? "good" : "caution"}>
            {source === "beec" ? "실시간 계산" : "데모용 추정치"}
          </Badge>
        ) : null}
      </div>

      {selectedCount === 0 ? (
        <p className="text-[length:var(--text-body-size)] text-[var(--text-muted)]">
          아래 실천 항목을 체크하면 등급이 어떻게 바뀌는지 바로 보여드려요.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-[var(--space-4)]">
            <EnergyGradeBadge grade={currentGrade} size="md" caption="현재" />
            <Icon name="arrow-right" size={24} className="text-[var(--text-muted)]" />
            <EnergyGradeBadge grade={projectedGrade} size="md" caption="적용 후" />
            <div className="flex flex-col gap-1">
              <p className="text-[length:var(--text-body-size)] font-bold text-[var(--text-strong)]">
                {improved
                  ? `${selectedCount}개 항목 적용 시 ${currentGrade}등급 → ${projectedGrade}등급`
                  : `${selectedCount}개 항목 적용 — 등급 변화는 아직 없어요`}
              </p>
              <p className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
                1차에너지소요량 {formatNumber(currentPrimaryEnergyKwh)} → {formatNumber(projectedPrimaryEnergyKwh)}{" "}
                kWh/㎡·yr (▼{reductionPercent}%)
              </p>
            </div>
          </div>

          <p className="text-[length:var(--text-body-size)] text-[var(--text-body)]">
            예상 절감액 월 <strong className="text-[var(--teal-700)]">{formatManwon(totalMonthlySavingsManwon)}</strong>
          </p>

          <ButtonLink
            href={`/report/${buildingId}`}
            variant="outline"
            className="self-start"
            trailingIcon={<Icon name="arrow-right" size={20} />}
          >
            성적표에서 확인하기
          </ButtonLink>
        </>
      )}
    </Card>
  );
}

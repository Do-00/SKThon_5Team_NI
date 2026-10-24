"use client";

import { useEffect, useMemo, useState } from "react";
import { getEcoActions, type EcoAction } from "@/src/data/actions";
import type { SimulateResult } from "@/src/lib/beec-client";
import { mapSimulateResponse, simulateWhatIfLocally, toSimulatePurpose, type WhatIfResult } from "@/src/lib/what-if";
import type { GradeCode } from "@/src/data/grades";

/**
 * The report page's "개선 후" view: the projected grade/energy with **every**
 * recommended 절감 action applied (not just the ones checked on the 절감 하기
 * page). Calls beec's `/api/simulate` with all measure codes, and uses the
 * local estimate (`simulateWhatIfLocally`) until — or instead of, if beec is
 * unreachable — that answer arrives, so the tab always has a grade to show.
 */
export function useWhatIfProjection(
  primaryEnergyKwh: number,
  useType: string,
  realGrade: GradeCode,
) {
  const [actions, setActions] = useState<EcoAction[]>([]);

  useEffect(() => {
    let cancelled = false;
    getEcoActions().then((all) => {
      if (!cancelled) setActions(all);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const measureCodes = useMemo(
    () => actions.map((action) => action.measureCode).filter((code): code is string => Boolean(code)),
    [actions],
  );
  const totalMonthlySavingsManwon = useMemo(
    () => actions.reduce((sum, action) => sum + action.monthlySavingsManwon, 0),
    [actions],
  );
  const localResult = useMemo(
    // 1차에너지소요량이 없으면(추정 보류) 개선 후를 계산할 기준이 없다 — 지어내지 않는다.
    () => (actions.length > 0 && primaryEnergyKwh > 0 ? simulateWhatIfLocally(primaryEnergyKwh, realGrade, actions) : null),
    [actions, primaryEnergyKwh, realGrade],
  );

  const requestKey = measureCodes.length > 0 && primaryEnergyKwh > 0 ? `${primaryEnergyKwh}|${measureCodes.join(",")}|${useType}` : null;
  const [remote, setRemote] = useState<{ key: string; result: WhatIfResult } | null>(null);

  useEffect(() => {
    if (requestKey === null) return;
    let cancelled = false;

    const params = new URLSearchParams({
      baseEnergy: String(primaryEnergyKwh),
      measures: measureCodes.join(","),
      purpose: toSimulatePurpose(useType),
    });

    fetch(`/api/simulate?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`status ${res.status}`))))
      .then((data: SimulateResult) => {
        if (cancelled) return;
        const mapped = mapSimulateResponse(data, totalMonthlySavingsManwon, realGrade);
        if (mapped) setRemote({ key: requestKey, result: mapped });
      })
      .catch(() => {
        // beec unreachable — stay on the local estimate below.
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const result = requestKey !== null && remote?.key === requestKey ? remote.result : localResult;

  return {
    actionCount: actions.length,
    result,
  };
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, Icon, RadioGroup } from "@/src/components/ui";
import { EnergyGradeBadge } from "@/src/components/domain";
import type { GradeCode } from "@/src/data/grades";
import { USER_TYPE_LABEL } from "@/src/lib/audience";
import { formatManwon } from "@/src/lib/format";
import { fallbackRoleAdvice, type OccupantRole, type RoleAdviceInput } from "@/src/lib/role-advice";

export interface SaveSummaryDialogProps {
  open: boolean;
  onClose: () => void;
  buildingId: string;
  buildingName: string;
  address: string;
  completionYear: number;
  useType: string;
  grade: GradeCode;
  isEstimated: boolean;
  primaryEnergyKwh: number;
  /** `null` when the building has no detailed report yet (see `hasFullReport` in the report page). */
  annualSavingsPotentialManwon: number | null;
}

/** Roles a visitor can preview AI advice for before signing in — mirrors the checklist's "임차인, 저장 누르면 나오는 페이지". */
const PREVIEW_ROLES: OccupantRole[] = ["owner", "tenant"];

const ROLE_HEADING: Record<OccupantRole, string> = {
  owner: "임차인에게 이렇게 안내해보세요",
  tenant: "이렇게 대처해보세요",
};

/**
 * Fetches the Gemini-written advice for one role. Mounted with `key={role}`
 * by the parent so switching roles remounts (and re-loads) this block
 * instead of resetting state from inside an effect.
 */
function RoleAdviceBlock({ input }: { input: RoleAdviceInput }) {
  const [advice, setAdvice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/role-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`status ${res.status}`))))
      .then((data: { advice?: string }) => {
        if (!cancelled) {
          setAdvice(data.advice ?? fallbackRoleAdvice(input));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAdvice(fallbackRoleAdvice(input));
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-start gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--teal-100)] bg-[var(--surface-brand-soft)] p-[var(--space-4)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--teal-600)] text-white">
        <Icon name="sparkles" size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-[var(--teal-700)]">{ROLE_HEADING[input.role]} · Gemini</p>
        {advice === null ? (
          <div className="mt-[var(--space-2)] h-5 w-3/4 animate-pulse rounded bg-[var(--teal-100)]" />
        ) : (
          <p className="mt-[var(--space-1)] text-[15px] font-bold leading-relaxed text-[var(--text-strong)]">
            {advice}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Popup shown when a signed-out visitor taps "저장": a quick preview of what
 * saving unlocks — the grade summary, plus a Gemini-written one-liner of
 * what the 소유주 could tell their 임차인 (or what the 임차인 should do)
 * for the picked role — before sending them to `/login`.
 */
export function SaveSummaryDialog({
  open,
  onClose,
  buildingId,
  buildingName,
  address,
  completionYear,
  useType,
  grade,
  isEstimated,
  primaryEnergyKwh,
  annualSavingsPotentialManwon,
}: SaveSummaryDialogProps) {
  const router = useRouter();
  const [role, setRole] = useState<OccupantRole>("owner");

  function handleContinue() {
    router.push(`/login?next=${encodeURIComponent(`/report/${buildingId}`)}`);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="저장하면 이렇게 확인할 수 있어요"
      description="로그인하고 저장하면 성적표를 마이페이지에서 다시 볼 수 있어요."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            닫기
          </Button>
          <Button type="button" variant="primary" onClick={handleContinue}>
            로그인하고 저장하기
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-[var(--space-4)] rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-[var(--space-4)]">
        <EnergyGradeBadge grade={grade} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-[var(--text-strong)]">{buildingName}</p>
          <p className="text-[13px] text-[var(--text-muted)]">
            {annualSavingsPotentialManwon
              ? `권장 조치를 모두 실천하면 연간 최대 ${formatManwon(annualSavingsPotentialManwon)} 절감`
              : "절감 하기에서 이 건물에 맞는 실천 항목을 확인해보세요"}
          </p>
        </div>
      </div>

      <RadioGroup
        legend="어떤 입장에서 확인할까요?"
        orientation="horizontal"
        variant="card"
        options={PREVIEW_ROLES.map((value) => ({ value, label: USER_TYPE_LABEL[value] }))}
        value={role}
        onValueChange={(value) => setRole(value as OccupantRole)}
      />

      <RoleAdviceBlock
        key={role}
        input={{
          buildingName,
          address,
          completionYear,
          useType,
          grade,
          isEstimated,
          primaryEnergyKwh,
          annualSavingsPotentialManwon,
          role,
        }}
      />
    </Dialog>
  );
}

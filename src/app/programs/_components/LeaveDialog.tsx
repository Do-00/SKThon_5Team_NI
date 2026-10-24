"use client";

import { Button, Dialog } from "@/src/components/ui";
import { formatProgramDeadline } from "@/src/components/domain/ProgramCard";
import type { SupportProgram } from "@/src/data/programs";

export interface LeaveDialogProps {
  /** The program whose external application page the user is about to leave for. `null` closes the dialog. */
  program: SupportProgram | null;
  onClose: () => void;
}

/**
 * Accessible confirmation shown before navigating away from Eco Check to a
 * program's official application page. Only on explicit confirm does it call
 * `window.open(url, "_blank", "noopener,noreferrer")` — there is no API call
 * or logging of the action anywhere in this flow.
 *
 * Some real programs (see `src/data/programs.ts`) have no confirmed
 * `officialUrl` — rather than fabricate a link, the primary action is
 * disabled and `applyMethod` is shown instead so the user still knows where
 * to go (e.g. a specific 행정복지센터).
 */
export function LeaveDialog({ program, onClose }: LeaveDialogProps) {
  const officialUrl = program?.officialUrl ?? null;

  return (
    <Dialog
      open={program !== null}
      onClose={onClose}
      title={program?.name ?? ""}
      description={
        program
          ? `${program.provider} · ${formatProgramDeadline(program.deadline)}`
          : undefined
      }
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            닫기
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!officialUrl}
            onClick={() => {
              if (officialUrl) {
                window.open(officialUrl, "_blank", "noopener,noreferrer");
              }
              onClose();
            }}
          >
            신청하러 가기
          </Button>
        </>
      }
    >
      {program ? (
        <dl className="flex flex-col gap-[var(--space-3)] text-[length:var(--text-body-size)]">
          <div>
            <dt className="font-bold text-[var(--text-strong)]">지원 대상</dt>
            <dd className="text-[var(--text-body)]">{program.targetDesc}</dd>
          </div>
          <div>
            <dt className="font-bold text-[var(--text-strong)]">신청 방법</dt>
            <dd className="text-[var(--text-body)]">{program.applyMethod}</dd>
          </div>
          {!officialUrl ? (
            <p className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
              공식 신청 페이지 링크가 아직 확인되지 않았어요. 위 신청 방법으로 직접 문의해 주세요.
            </p>
          ) : (
            <p className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
              에코 체크를 벗어나 기관의 공식 신청 페이지로 이동합니다.
            </p>
          )}
          {program.note ? (
            <p className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">참고: {program.note}</p>
          ) : null}
        </dl>
      ) : null}
    </Dialog>
  );
}

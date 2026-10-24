"use client";

import { useState } from "react";
import { Button, Icon, ToastProvider, useToast } from "@/src/components/ui";
import type { GradeCode } from "@/src/data/grades";
import { SaveSummaryDialog } from "./SaveSummaryDialog";

interface ReportActionsProps {
  buildingId: string;
  buildingName: string;
  address: string;
  completionYear: number;
  useType: string;
  grade: GradeCode;
  isEstimated: boolean;
  primaryEnergyKwh: number;
  annualSavingsPotentialManwon: number | null;
}

function ReportActionButtons({
  buildingId,
  buildingName,
  address,
  completionYear,
  useType,
  grade,
  isEstimated,
  primaryEnergyKwh,
  annualSavingsPotentialManwon,
}: ReportActionsProps) {
  const { show } = useToast();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    const shareData = {
      title: `${buildingName} 에너지 성적표`,
      text: `${buildingName}의 에너지 등급을 확인해 보세요.`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      show({
        title: "링크를 복사했어요",
        description: "원하는 곳에 붙여넣어 성적표를 공유하세요.",
        tone: "good",
      });
    } catch {
      show({
        title: "링크를 자동으로 복사하지 못했어요",
        description: "브라우저 주소창의 링크를 직접 복사해 주세요.",
        tone: "warn",
      });
    }
  }

  return (
    <>
      <div className="flex w-full gap-[var(--space-3)]">
        <Button
          variant="secondary"
          size="md"
          fullWidth
          leadingIcon={<Icon name="share" size={20} />}
          onClick={handleShare}
        >
          공유
        </Button>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          leadingIcon={<Icon name="file-text" size={20} />}
          onClick={() => setSaveDialogOpen(true)}
        >
          저장
        </Button>
      </div>

      <SaveSummaryDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        buildingId={buildingId}
        buildingName={buildingName}
        address={address}
        completionYear={completionYear}
        useType={useType}
        grade={grade}
        isEstimated={isEstimated}
        primaryEnergyKwh={primaryEnergyKwh}
        annualSavingsPotentialManwon={annualSavingsPotentialManwon}
      />
    </>
  );
}

export function ReportActions(props: ReportActionsProps) {
  return (
    <ToastProvider>
      <ReportActionButtons {...props} />
    </ToastProvider>
  );
}

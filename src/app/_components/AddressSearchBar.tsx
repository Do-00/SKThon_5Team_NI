"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { KeyboardEvent } from "react";
import { Button, Dialog, Icon, Input, cn } from "@/src/components/ui";
import type { ApartmentChecklistAnswers } from "@/src/lib/apartment-checklist";
import { embedKakaoPostcode, loadKakaoPostcode, type KakaoPostcodeData } from "@/src/lib/kakao-postcode";
import { ApartmentChecklistStep } from "./ApartmentChecklistStep";

export interface AddressSearchBarProps {
  /** Address shown in the box once one has been picked. */
  value?: string;
  onSelect: (data: KakaoPostcodeData, checklist: ApartmentChecklistAnswers) => void;
  submitLabel?: string;
  className?: string;
}

type ScriptStatus = "loading" | "ready" | "error";
/** `search`: Kakao embed. `checklist`: apartment picked, asking follow-up questions. */
type DialogStep = "search" | "checklist";

/** 아파트가 아닌 건물은 추가 질문 없이 바로 건축물대장으로 찾는다. */
const NO_CHECKLIST: ApartmentChecklistAnswers = { completionYear: null, builder: "", heatingType: null };

/**
 * White raised panel used by the home hero and `/search`'s `SearchBar`:
 * instead of free text it opens the Kakao 우편번호 search in a dialog so the
 * backend always receives a normalized 도로명/지번 pair. The input is
 * read-only and acts as the trigger.
 */
export function AddressSearchBar({ value = "", onSelect, submitLabel = "등급 확인하기", className }: AddressSearchBarProps) {
  const [status, setStatus] = useState<ScriptStatus>("loading");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>("search");
  const [pickedData, setPickedData] = useState<KakaoPostcodeData | null>(null);
  // Bumped to force the embed `<div>` to remount (and re-run `embedKakaoPostcode`)
  // when returning to the "search" step without the dialog itself closing —
  // same element type/position would otherwise make React reuse the DOM node
  // and skip the ref callback that re-embeds the (auto-removed) iframe.
  const [embedKey, setEmbedKey] = useState(0);
  const inputId = useId();

  // Preload on mount so the dialog's search UI appears without a script-load delay.
  useEffect(() => {
    let cancelled = false;
    loadKakaoPostcode().then(
      () => !cancelled && setStatus("ready"),
      () => !cancelled && setStatus("error"),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setStep("search");
    setPickedData(null);
  }, []);

  const retrySearch = useCallback(() => {
    setStep("search");
    setPickedData(null);
    setEmbedKey((key) => key + 1);
  }, []);

  // Callback ref: embed as soon as the dialog's container is in the DOM.
  const embedContainerRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      embedKakaoPostcode(
        element,
        (data) => {
          if (data.apartment === "Y") {
            setPickedData(data);
            setStep("checklist");
            return;
          }
          // 상가·사무실·학교·주택 등 모든 건물: 체크리스트 없이 바로 조회한다.
          setDialogOpen(false);
          setStep("search");
          onSelect(data, NO_CHECKLIST);
        },
        { q: value || undefined },
      );
    },
    [value, onSelect],
  );

  function handleChecklistSubmit(answers: ApartmentChecklistAnswers) {
    if (!pickedData) return;
    setDialogOpen(false);
    setStep("search");
    onSelect(pickedData, answers);
    setPickedData(null);
  }

  function openDialog() {
    if (status === "ready") setDialogOpen(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDialog();
    }
  }

  return (
    <div
      role="search"
      aria-label="건물 주소 검색"
      className={cn(
        "flex w-full flex-col gap-[var(--space-3)] rounded-[var(--radius-lg)] bg-[var(--surface-card)] p-[var(--space-3)] shadow-[var(--shadow-raised)] sm:flex-row sm:items-start",
        className
      )}
    >
      <label htmlFor={inputId} className="sr-only">
        건물 주소
      </label>
      <Input
        id={inputId}
        type="text"
        readOnly
        value={value}
        onClick={openDialog}
        onKeyDown={handleKeyDown}
        placeholder="도로명·지번 주소를 검색하세요 (예: 월드컵로 120)"
        leadingIcon={<Icon name="search" size={22} />}
        error={status === "error" ? "주소 검색을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요." : undefined}
        wrapperClassName="flex-1"
        className="h-14 cursor-pointer"
      />
      <Button
        variant="primary"
        size="lg"
        loading={status === "loading"}
        disabled={status === "error"}
        onClick={openDialog}
        trailingIcon={<Icon name="arrow-right" size={22} />}
      >
        {submitLabel}
      </Button>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={step === "checklist" ? "집 정보 입력" : "주소 검색"}
        description={
          step === "checklist"
            ? "선택하신 아파트에 대해 몇 가지만 더 알려주세요."
            : "도로명, 건물명, 지번 중 하나로 검색한 뒤 결과를 선택해 주세요."
        }
        className="max-w-[520px]"
      >
        {step === "checklist" && pickedData ? (
          <ApartmentChecklistStep data={pickedData} onBack={retrySearch} onSubmit={handleChecklistSubmit} />
        ) : (
          <div key={embedKey} ref={embedContainerRef} className="h-[min(470px,60vh)] w-full" />
        )}
      </Dialog>
    </div>
  );
}

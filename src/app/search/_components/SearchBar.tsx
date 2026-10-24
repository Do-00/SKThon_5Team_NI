"use client";

import { AddressSearchBar } from "@/src/app/_components/AddressSearchBar";
import { useAddressLookup } from "@/src/app/_components/use-address-lookup";
import { cn } from "@/src/components/ui";

export interface SearchBarProps {
  /** Pre-fills the box (and the Kakao search field), e.g. from the current `?q=` search param. */
  defaultValue?: string;
  submitLabel?: string;
  className?: string;
}

/**
 * `/search`'s address box: the same Kakao 우편번호 search as the home hero,
 * so every search sends beec a normalized 도로명/지번 pair instead of free text.
 */
export function SearchBar({ defaultValue = "", submitLabel = "등급 확인하기", className }: SearchBarProps) {
  const { address, status, handleSelect } = useAddressLookup();

  return (
    <div className={cn("flex w-full flex-col gap-[var(--space-2)]", className)}>
      <AddressSearchBar value={address || defaultValue} onSelect={handleSelect} submitLabel={submitLabel} />
      <p
        role={status === "error" ? "alert" : "status"}
        className={cn(
          "min-h-[1.65em] text-[length:var(--text-body-size)] break-keep",
          status === "error" ? "text-[var(--status-danger)]" : "text-[var(--text-muted)]"
        )}
      >
        {status === "loading"
          ? "성적표를 불러오는 중…"
          : status === "error"
            ? "등급 서버에 연결하지 못했어요. 백엔드가 켜져 있는지 확인한 뒤 다시 검색해 주세요."
            : null}
      </p>
    </div>
  );
}

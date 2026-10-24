"use client";

import { Card, Icon } from "@/src/components/ui";
import { AddressSearchBar } from "./AddressSearchBar";
import { useAddressLookup, type LookupStatus } from "./use-address-lookup";

/** Same footprint as `EnergyGradeBadge size="lg"`, in neutral grey, for "no grade yet". */
function UnknownGradeBadge({
  caption,
  pulsing = false,
}: {
  caption: string;
  pulsing?: boolean;
}) {
  return (
    <span className="inline-flex shrink-0 flex-col items-center gap-[var(--space-2)]">
      <span
        className={`flex h-[116px] w-[116px] items-center justify-center rounded-[var(--radius-lg)] border-[3px] border-[var(--ink-300)] bg-[var(--surface-sunken)] font-brand text-[64px] font-black leading-none text-[var(--ink-400)]${pulsing ? " animate-pulse" : ""}`}
      >
        <span aria-hidden="true">?</span>
        <span className="sr-only">등급 미확인</span>
      </span>
      <span className="whitespace-nowrap text-[18px] font-bold text-[var(--text-body)]">
        {caption}
      </span>
    </span>
  );
}

const CAPTIONS: Record<LookupStatus, string> = {
  idle: "주소 입력 전",
  loading: "성적표를 불러오는 중…",
  error: "조회 실패",
};

/**
 * Home hero: address search on the left, a grey "?" placeholder card on the
 * right. Picking an address runs `useAddressLookup` — the report on a beec
 * hit, `/search`'s 등급 추정 form otherwise. The card only ever shows
 * idle/loading/error.
 */
export function HomeHero() {
  const { picked, address, status, handleSelect } = useAddressLookup();

  return (
    <section
      aria-labelledby="home-hero-title"
      className="bg-[var(--surface-brand)]"
    >
      <div className="eco-container grid items-center gap-[var(--space-12)] py-[var(--space-16)] lg:grid-cols-[1.1fr_0.9fr] lg:gap-[var(--space-16)] lg:py-[var(--space-20)]">
        <div className="flex min-w-0 flex-col gap-[var(--space-6)]">
          <span className="inline-flex items-center gap-1.5 self-start whitespace-nowrap rounded-[var(--radius-pill)] bg-[var(--teal-100)] px-4 py-2 text-[17px] font-bold text-[var(--teal-800)]">
            <Icon name="leaf" size={17} />
            우리 집·우리 가게는 몇 등급일까?
          </span>
          <h1
            id="home-hero-title"
            className="font-brand text-[40px] font-black leading-[1.15] tracking-[-0.03em] text-white md:text-[56px]"
          >
            AI로 읽는
            <br />
            건물 에너지 성적표
          </h1>
          {/* break-keep: 한국어는 기본적으로 글자 단위로 줄이 바뀌어 「맞/춤」처럼 단어가 쪼개지므로, 띄어쓰기 단위로만 줄을 바꿉니다. */}
          <p className="max-w-[560px] break-keep text-[20px] font-medium leading-[1.65] text-white md:text-[22px]">
            아파트부터 상가·사무실·학교까지. 인증 이력이 없는 건물도 공공 데이터로 등급을 판단하고, 법령 근거와 맞춤
            지원사업까지 연결해 드려요.
          </p>
          <AddressSearchBar
            value={address}
            onSelect={handleSelect}
            className="max-w-[620px]"
          />
        </div>

        <div className="flex justify-center">
          <Card
            padding="lg"
            aria-live="polite"
            aria-busy={status === "loading"}
            className="flex w-full max-w-[380px] flex-col items-center gap-[var(--space-5)]"
          >
            <div className="flex w-full items-center gap-[var(--space-3)] rounded-[var(--radius-md)] bg-[var(--surface-sunken)] px-[var(--space-4)] py-[var(--space-3)]">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-brand-soft)] text-[var(--teal-700)]"
              >
                <Icon name="map-pin" size={18} />
              </span>
              <p className="text-left text-[18px] font-medium leading-[1.45] break-keep text-[var(--text-body)]">
                {picked ? (
                  address
                ) : (
                  <>
                    주소를 입력하면
                    <br />
                    에너지 등급을 알려 드려요
                  </>
                )}
              </p>
            </div>
            <UnknownGradeBadge
              caption={CAPTIONS[status]}
              pulsing={status === "loading"}
            />
            {status === "error" ? (
              <p
                role="alert"
                className="text-center text-[17px] font-medium leading-[1.6] break-keep text-[var(--status-danger)]"
              >
                등급 서버에 연결하지 못했어요. 백엔드가 켜져 있는지 확인한 뒤
                다시 검색해 주세요.
              </p>
            ) : null}
            <p className="w-full border-t border-[var(--border-subtle)] pt-[var(--space-4)] text-center text-[17px] font-medium text-[var(--text-body)]">
              가입 없이, 주소만으로 바로 확인할 수 있어요
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}

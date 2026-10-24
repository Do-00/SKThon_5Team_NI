import { ButtonLink } from "@/src/components/ui";

/** Route-local 404 shown when `getBuildingById` can't match the `[buildingId]` segment. */
export default function GuideNotFound() {
  return (
    <main className="eco-container flex flex-col items-center gap-[var(--space-4)] py-[var(--space-12)] text-center">
      <span aria-hidden="true" className="text-[length:var(--text-title-size)]">
        🏚️
      </span>
      <h1 className="eco-heading text-[var(--text-strong)]">해당 건물을 찾을 수 없어요</h1>
      <p className="max-w-[var(--width-reading)] text-[length:var(--text-body-size)] text-[var(--text-muted)]">
        주소나 건물명을 다시 확인해 주세요. 검색 결과에서 건물을 선택하면 맞춤 실천 가이드를 볼 수 있어요.
      </p>
      <ButtonLink href="/" variant="primary">
        건물 다시 검색하기
      </ButtonLink>
    </main>
  );
}

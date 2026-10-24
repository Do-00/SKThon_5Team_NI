import { PageSection, SiteShell } from "@/src/components/layout";

/** Route-local loading skeleton, shown while `page.tsx` awaits the search fixtures. */
export default function SearchLoading() {
  return (
    <SiteShell>
      <PageSection aria-busy="true" aria-live="polite" className="flex flex-col gap-[var(--space-6)]">
        <span className="sr-only">검색 결과를 불러오는 중입니다.</span>
        <div aria-hidden="true" className="h-10 w-80 max-w-full animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-sunken)]" />
        <div aria-hidden="true" className="h-20 max-w-2xl animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-sunken)]" />
        <div aria-hidden="true" className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-sunken)]" />
          ))}
        </div>
      </PageSection>
    </SiteShell>
  );
}

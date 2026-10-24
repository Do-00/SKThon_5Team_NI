import { PageSection, SiteShell } from "@/src/components/layout";

/** Route-local loading skeleton, shown while `page.tsx` awaits the building/action fixtures. */
export default function GuideLoading() {
  return (
    <SiteShell>
      <PageSection
        aria-busy="true"
        aria-live="polite"
        className="grid grid-cols-1 items-start gap-[var(--space-6)] lg:grid-cols-[360px_minmax(0,1fr)]"
      >
        <span className="sr-only">가이드를 불러오는 중입니다.</span>
        <div aria-hidden="true" className="h-96 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-sunken)]" />
        <div aria-hidden="true" className="flex flex-col gap-[var(--space-3)]">
          <div className="h-9 w-1/2 animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-sunken)]" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-sunken)]" />
          ))}
        </div>
      </PageSection>
    </SiteShell>
  );
}

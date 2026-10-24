import { PageSection, SiteShell } from "@/src/components/layout";

/** Route-local loading skeleton, shown while `page.tsx` awaits the program fixtures. */
export default function ProgramsLoading() {
  return (
    <SiteShell>
      <PageSection aria-busy="true" aria-live="polite" className="flex flex-col gap-[var(--space-5)]">
        <span className="sr-only">지원사업 목록을 불러오는 중입니다.</span>
        <div aria-hidden="true" className="h-10 w-64 animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-sunken)]" />
        <div aria-hidden="true" className="flex flex-wrap gap-[var(--space-3)]">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-11 w-20 animate-pulse rounded-[var(--radius-pill)] bg-[var(--surface-sunken)]" />
          ))}
        </div>
        <div aria-hidden="true" className="grid grid-cols-1 gap-[var(--space-4)] md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-52 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-sunken)]" />
          ))}
        </div>
      </PageSection>
    </SiteShell>
  );
}

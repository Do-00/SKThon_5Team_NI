/** Route-local loading skeleton, shown while `page.tsx` awaits the building/report fixtures. */
export default function ReportLoading() {
  return (
    <main aria-busy="true" aria-live="polite">
      <span className="sr-only">에너지 성적표를 불러오는 중입니다.</span>
      <div className="eco-container flex flex-col gap-[var(--space-4)] py-[var(--space-10)]">
        <div className="h-4 w-40 animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-sunken)]" />
        <div className="h-9 w-3/4 animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-sunken)]" />
        <div className="h-5 w-full max-w-[var(--width-reading)] animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-sunken)]" />
      </div>
      <div className="eco-container flex flex-col gap-[var(--space-6)] pb-[var(--space-12)]" aria-hidden="true">
        <div className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-sunken)]" />
        <div className="grid grid-cols-1 gap-[var(--gap-card)] md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-sunken)]" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-sunken)]" />
        <div className="h-80 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-sunken)]" />
      </div>
    </main>
  );
}

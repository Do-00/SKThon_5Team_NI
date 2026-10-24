"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SupportProgram } from "@/src/data/programs";
import { ProgramCard } from "@/src/components/domain/ProgramCard";
import { SectionHeader } from "@/src/components/layout/SectionHeader";
import { Switch, ToastProvider, cn, useToast } from "@/src/components/ui";
import { LeaveDialog } from "./LeaveDialog";
import { getProgramFilters } from "../_lib/program-tags";

export interface ProgramsExplorerProps {
  programs: SupportProgram[];
  /** Filter id pre-selected from the `?tag=` query string on first load, if any. */
  initialFilter: string | null;
}

const FILTER_BUTTON_BASE =
  "inline-flex min-h-11 items-center whitespace-nowrap rounded-[var(--radius-pill)] border px-[18px] text-[length:var(--text-label-size)] font-medium transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)]";

/**
 * `ToastProvider` wraps this subtree so the notification-switch toast stays
 * scoped to the Programs route.
 */
export function ProgramsExplorer(props: ProgramsExplorerProps) {
  return (
    <ToastProvider>
      <ProgramsExplorerInner {...props} />
    </ToastProvider>
  );
}

function ProgramsExplorerInner({ programs, initialFilter }: ProgramsExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  const filters = getProgramFilters(programs);
  const [activeId, setActiveId] = useState(
    initialFilter && filters.some((filter) => filter.id === initialFilter) ? initialFilter : "all",
  );
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<SupportProgram | null>(null);

  const selectFilter = useCallback(
    (id: string) => {
      setActiveId(id);
      const query = id === "all" ? "" : `?tag=${encodeURIComponent(id)}`;
      // {scroll:false} keeps the list in place — this is a client-side
      // filter, not a navigation, so the viewport shouldn't jump.
      router.replace(`${pathname}${query}`, { scroll: false });
    },
    [pathname, router],
  );

  const handleNotifyChange = useCallback(
    (checked: boolean) => {
      setNotifyEnabled(checked);
      toast.show({
        title: checked ? "신규 지원사업 알림을 켰어요" : "신규 지원사업 알림을 껐어요",
        description: checked
          ? "새로운 지원사업이 등록되면 알려드릴게요."
          : "필요할 때 다시 켤 수 있어요.",
        tone: checked ? "good" : "neutral",
      });
    },
    [toast],
  );

  const activeFilter = filters.find((filter) => filter.id === activeId) ?? filters[0];
  const filteredPrograms = programs.filter(activeFilter.matches);

  return (
    <div className="flex flex-col gap-[var(--space-5)]">
      <SectionHeader as="h1" title="지원사업 매칭" hint={`${filteredPrograms.length}건`} />

      <div className="flex flex-col gap-[var(--space-3)] md:flex-row md:items-center">
        <div role="group" aria-label="지원사업 필터" className="flex flex-wrap gap-[var(--space-3)]">
          {filters.map((filter) => {
            const isActive = filter.id === activeFilter.id;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => selectFilter(filter.id)}
                className={cn(
                  FILTER_BUTTON_BASE,
                  isActive
                    ? "border-[var(--action-primary)] bg-[var(--action-primary)] text-[var(--text-on-primary)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-body)] hover:border-[var(--border-brand)]",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="md:ml-auto">
          <Switch
            label="새 사업 알림"
            checked={notifyEnabled}
            onChange={(event) => handleNotifyChange(event.target.checked)}
          />
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {activeFilter.label} 지원사업 {filteredPrograms.length}건
      </p>

      {filteredPrograms.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] p-[var(--pad-card)] text-center text-[length:var(--text-body-size)] text-[var(--text-muted)]">
          이 조건에 해당하는 지원사업이 아직 없어요.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-[var(--space-4)] md:grid-cols-2 lg:grid-cols-3">
          {filteredPrograms.map((program) => (
            <li key={program.id}>
              <ProgramCard program={program} onSelect={setLeaveTarget} />
            </li>
          ))}
        </ul>
      )}

      <LeaveDialog program={leaveTarget} onClose={() => setLeaveTarget(null)} />
    </div>
  );
}

import type { Metadata } from "next";
import { getSupportPrograms } from "@/src/data/programs";
import { PageSection, SiteShell } from "@/src/components/layout";
import { ProgramsExplorer } from "./_components/ProgramsExplorer";

export const metadata: Metadata = {
  title: "지원사업 매칭",
};

function readInitialTag(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return null;
}

/**
 * Server shell for the support-programs list. Awaits `searchParams` for the
 * `?tag=` deep link, fetches every fixture program, and hands them to the
 * `ProgramsExplorer` client island for filtering, the notification
 * switch/toast, and the leave-confirmation dialog.
 */
export default async function ProgramsPage({ searchParams }: PageProps<"/programs">) {
  const resolvedSearchParams = await searchParams;
  const initialFilter = readInitialTag(resolvedSearchParams.tag);

  const programs = await getSupportPrograms();

  return (
    <SiteShell>
      <PageSection>
        <ProgramsExplorer programs={programs} initialFilter={initialFilter} />
      </PageSection>
    </SiteShell>
  );
}

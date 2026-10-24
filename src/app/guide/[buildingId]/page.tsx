import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBuildingById } from "@/src/data/buildings";
import { getEcoActions } from "@/src/data/actions";
import { PageSection, SiteShell } from "@/src/components/layout";
import { GuideChecklist } from "./_components/GuideChecklist";

export async function generateMetadata({
  params,
}: PageProps<"/guide/[buildingId]">): Promise<Metadata> {
  const { buildingId } = await params;
  const building = await getBuildingById(buildingId);
  return { title: building ? `${building.name} 에너지 절감 가이드` : "건물을 찾을 수 없어요" };
}

/**
 * Server shell for the eco-action guide of a single building. Fetches the
 * building (404s via `notFound()` when the id doesn't match any fixture) and
 * the full recommended-action list, then hands both to the `GuideChecklist`
 * client island for filtering/checklist interactivity.
 */
export default async function GuidePage({ params }: PageProps<"/guide/[buildingId]">) {
  const { buildingId } = await params;

  const building = await getBuildingById(buildingId);
  if (!building) {
    notFound();
  }

  const actions = await getEcoActions();

  return (
    <SiteShell>
      <PageSection>
        <h1 className="sr-only">{building.name} 에너지 절감 가이드</h1>
        <GuideChecklist
          buildingId={building.id}
          actions={actions}
          currentGrade={building.grade}
          currentPrimaryEnergyKwh={building.primaryEnergyKwh}
          buildingKind={
            building.general
              ? building.general.judgement.isResidential
                ? "residential"
                : "nonResidential"
              : "residential"
          }
        />
      </PageSection>
    </SiteShell>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { PageSection, SectionHeader, SiteShell } from "@/src/components/layout";
import { ButtonLink, Card, Icon } from "@/src/components/ui";
import { EnergyGradeBadge } from "@/src/components/domain";
import { searchBuildings } from "@/src/data/buildings";
import { formatDistance, formatNumber } from "@/src/lib/format";
import { EstimateFallbackForm } from "./_components/EstimateFallbackForm";
import { RememberSearch } from "./_components/RememberSearch";
import { SearchBar } from "./_components/SearchBar";

export const metadata = {
  title: "건물 에너지 등급 검색",
};

const SUGGESTED_QUERIES = ["월드컵로 120", "마포구", "상암"];

function normalizeQuery(raw: string | string[] | undefined): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function SuggestedQueries({ label }: { label?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-[var(--space-2)]">
      {label ? (
        <span className="text-[length:var(--text-caption-size)] font-bold text-[var(--text-muted)]">{label}</span>
      ) : null}
      {SUGGESTED_QUERIES.map((suggestion) => (
        <Link
          key={suggestion}
          href={`/search?q=${encodeURIComponent(suggestion)}`}
          className="inline-flex min-h-11 items-center rounded-[var(--radius-pill)] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-[18px] text-[length:var(--text-label-size)] font-medium text-[var(--text-body)] transition-colors duration-[var(--dur-fast)] hover:border-[var(--border-brand)] hover:text-[var(--text-link)]"
        >
          {suggestion}
        </Link>
      ))}
    </div>
  );
}

export default async function SearchPage(props: PageProps<"/search">) {
  const searchParams = await props.searchParams;
  const query = normalizeQuery(searchParams.q);
  // 홈 화면에서 넘어온 Kakao 건물명·도로명 — 아파트 API는 지번을 몰라 이걸로 찾는다.
  const buildingName = normalizeQuery(searchParams.bn);
  const roadAddress = normalizeQuery(searchParams.ra);
  const hasQuery = query !== undefined;
  const { buildings: results, offerEstimateFallback } = await searchBuildings(query, buildingName, roadAddress);

  // 검색 결과가 정확히 하나면(주소 하나로 특정된 것이므로) 목록을 거치지 않고 바로
  // 성적표로 넘어간다 — addr- 매칭은 이미 홈 화면에서 이렇게 동작하니, 아파트
  // API로 찾은 결과도 똑같이 맞춘다.
  if (hasQuery && results.length === 1) {
    redirect(`/report/${results[0].id}`);
  }

  return (
    <SiteShell>
      <PageSection className="flex flex-col gap-[var(--space-6)]">
        <SectionHeader
          as="h1"
          title="건물 에너지 등급 검색"
          description="카카오 주소 검색으로 도로명·지번·건물명을 찾으면 에너지효율등급과 인근 건물 비교 결과를 확인할 수 있어요."
        />

        <SearchBar defaultValue={query ?? ""} submitLabel="검색" className="max-w-2xl" />

        {hasQuery ? <RememberSearch query={query} /> : null}

        {hasQuery ? (
          <p role="status" className="text-[length:var(--text-label-size)] font-medium text-[var(--text-muted)]">
            <span className="font-bold text-[var(--text-strong)]">&lsquo;{query}&rsquo;</span> 검색 결과{" "}
            {formatNumber(results.length)}건
          </p>
        ) : null}

        {!hasQuery ? (
          <Card padding="lg" className="flex flex-col items-center gap-[var(--space-4)] py-[var(--space-16)] text-center">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-brand-soft)] text-[var(--teal-700)]"
            >
              <Icon name="search" size={28} />
            </span>
            <div className="flex flex-col gap-[var(--space-2)]">
              <h2 className="eco-heading">검색할 주소를 입력해 주세요</h2>
              <p className="mx-auto max-w-md text-[length:var(--text-body-size)] text-[var(--text-muted)]">
                건물의 도로명 주소를 입력하면 에너지효율등급, 인근 건물 비교, 맞춤 절감 방법까지 확인할 수 있어요.
              </p>
            </div>
            <SuggestedQueries label="인기 검색어" />
          </Card>
        ) : results.length === 0 && offerEstimateFallback ? (
          <EstimateFallbackForm query={query ?? ""} />
        ) : results.length === 0 ? (
          <Card padding="lg" className="flex flex-col items-center gap-[var(--space-4)] py-[var(--space-16)] text-center">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] bg-[var(--status-warn-soft)] text-[var(--status-warn)]"
            >
              <Icon name="info" size={28} />
            </span>
            <div className="flex flex-col gap-[var(--space-2)]">
              <h2 className="eco-heading">&lsquo;{query}&rsquo;에 대한 검색 결과가 없어요</h2>
              <p className="mx-auto max-w-md text-[length:var(--text-body-size)] text-[var(--text-muted)]">
                주소 철자를 다시 확인하거나 동/도로명까지만 입력해 검색해보세요.
              </p>
            </div>
            <SuggestedQueries />
            <ButtonLink href="/search" variant="ghost" size="sm">
              전체 검색으로 돌아가기
            </ButtonLink>
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
            {results.map((building) => (
              <li key={building.id}>
                <Link href={`/report/${building.id}`} className="group block h-full">
                  <Card interactive className="flex h-full flex-col gap-[var(--space-3)]">
                    <div className="flex items-start justify-between gap-[var(--space-3)]">
                      <div className="flex flex-col gap-[var(--space-1)]">
                        <h2 className="font-brand text-[length:var(--text-subhead-size)] font-bold text-[var(--text-strong)]">
                          {building.name}
                        </h2>
                        <p className="text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
                          {building.address}
                        </p>
                      </div>
                      <EnergyGradeBadge grade={building.grade} size="sm" />
                    </div>
                    <div className="mt-auto flex items-center gap-[var(--space-2)] text-[length:var(--text-caption-size)] font-medium text-[var(--text-muted)]">
                      <Icon name="map-pin" size={16} />
                      <span>
                        {building.distanceMeters === 0
                          ? "검색 주소와 일치"
                          : `검색 주소에서 약 ${formatDistance(building.distanceMeters)}`}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </SiteShell>
  );
}

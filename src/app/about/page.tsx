import type { Metadata } from "next";
import { PageSection, SectionHeader, SiteShell } from "@/src/components/layout";
import { Card, Icon } from "@/src/components/ui";
import type { IconName } from "@/src/components/ui";
import { EstimationMethod } from "./_components/EstimationMethod";
import { GeneralMethod } from "./_components/GeneralMethod";

export const metadata: Metadata = {
  title: "서비스 소개",
};

interface DataSource {
  icon: IconName;
  title: string;
  description: string;
  /** 제공 기관, e.g. `"한국에너지공단"`. 있으면 `url`과 함께 출처 링크로 보여줍니다. */
  source?: string;
  url?: string;
}

/**
 * 실제로 쓰는 데이터만 적습니다 — 쓰지 않는 출처를 적어두면 "그건 어떻게 연동했나" 에 답할 수 없습니다.
 * (건축물대장은 2026-10-24 부터 실제로 연동합니다: src/lib/building-registry.ts)
 */
const DATA_SOURCES: DataSource[] = [
  {
    icon: "building",
    title: "건축물대장 표제부",
    description: "전국 모든 건물의 주용도·사용승인일·연면적·구조·층수, 그리고 기재된 에너지효율등급",
    source: "국토교통부 건축HUB · 공공데이터포털",
    url: "https://www.data.go.kr/data/15134735/openapi.do",
  },
  {
    icon: "badge-check",
    title: "건축물 에너지효율등급 인증현황",
    description: "전국 인증 건물의 용도·지역·연면적·등급·인증일. 인증이 없는 건물과 비교할 기준이 됩니다",
    source: "건축물 에너지효율등급 인증시스템(beec)",
    url: "https://beec.energy.or.kr/BC/BC04/BC04_04_001.do",
  },
  {
    icon: "thermometer",
    title: "건물에너지 실사용량",
    description: "지번별 월간 전기·도시가스 사용량. 설계 기준인 인증 등급과 달리 실제로 쓴 에너지입니다",
    source: "국토교통부 건물에너지정보",
  },
  {
    icon: "home",
    title: "공동주택(아파트) 단지 정보",
    description: "세대수·동수·복도유형·난방방식. 서울 아파트 2,888개 단지는 전용 추정 모델로 더 정밀하게 봅니다",
    source: "공동주택관리정보시스템(K-apt)",
    url: "https://www.k-apt.go.kr",
  },
  {
    icon: "file-text",
    title: "법령·지원사업 고시",
    description: "녹색건축물 조성 지원법, 에너지절약설계기준, 그린리모델링 지원사업 운영 고시 등 — AI 상담의 근거",
    source: "국가법령정보 공동활용 OPEN API",
    url: "https://open.law.go.kr",
  },
];

export default function AboutPage() {
  return (
    <SiteShell>
      <PageSection>
        <div className="flex max-w-[860px] flex-col gap-[var(--space-6)]">
          <SectionHeader as="h1" title="등급은 이렇게 추정합니다" />

          <p className="text-[19px] leading-[1.7] text-[var(--text-body)]">
            국내 건축물 가운데 에너지 효율 등급 인증을 받은 건물은 일부에
            불과합니다. 에코 체크는 아파트·주택·상가·사무실·학교 등 인증받지 않은
            건물, 이른바 사각지대 건축물의 에너지 상태를 공공 데이터로 판단합니다.
            단, 근거가 부족하면 등급을 말하지 않습니다.
          </p>

          <ul
            id="data-sources"
            aria-label="등급 추정에 쓰는 공공 데이터"
            className="grid scroll-mt-[calc(var(--app-bar-height)+var(--space-6))] grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2"
          >
            {DATA_SOURCES.map((item) => {
              const body = (
                <>
                  <Icon
                    name={item.icon}
                    size={26}
                    className="shrink-0 text-[var(--teal-600)]"
                  />
                  <div className="flex-1">
                    <h2 className="font-sans text-[18px] font-bold tracking-normal text-[var(--text-strong)]">
                      {item.title}
                    </h2>
                    <p className="text-[17px] leading-[1.6] text-[var(--text-muted)]">
                      {item.description}
                    </p>
                    {item.source ? (
                      <p className="mt-1.5 flex items-center gap-1 text-[17px] font-medium text-[var(--teal-700)]">
                        {item.source}
                        {item.url ? (
                          <Icon name="external-link" size={16} />
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                </>
              );

              return (
                <li key={item.title}>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-full"
                    >
                      <Card
                        interactive
                        className="flex h-full items-start gap-3.5"
                      >
                        {body}
                      </Card>
                    </a>
                  ) : (
                    <Card className="flex h-full items-start gap-3.5">
                      {body}
                    </Card>
                  )}
                </li>
              );
            })}
          </ul>

          <GeneralMethod />

          <EstimationMethod />

          <Card
            tone="accent"
            padding="lg"
            className="flex items-start gap-[var(--space-4)]"
          >
            <Icon
              name="info"
              size={28}
              className="shrink-0 text-[var(--celadon-700)]"
            />
            <p className="text-[17px] leading-[1.7] text-[var(--text-body)]">
              추정 등급은 참고값입니다. 공식 에너지효율등급 인증을 대체하지
              않으며, 실제 사용량과 차이가 있을 수 있습니다. 지원사업 신청
              시에는 각 기관의 요건을 다시 확인해 주세요.
            </p>
          </Card>
        </div>
      </PageSection>
    </SiteShell>
  );
}

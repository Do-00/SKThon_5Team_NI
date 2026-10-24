import Link from "next/link";
import { getUserAccount } from "../../data/account";

interface FooterLinkGroup {
  title: string;
  links: { label: string; href: string }[];
}

/** Site-wide footer: brand recap, service/info link groups, and the estimate disclaimer. */
export async function SiteFooter() {
  const { primaryBuildingId } = await getUserAccount();
  const linkGroups: FooterLinkGroup[] = [
    {
      title: "서비스",
      links: [
        { label: "에너지 성적표", href: "/search" },
        { label: "절감 하기", href: `/guide/${primaryBuildingId}` },
        { label: "지원사업 매칭", href: "/programs" },
      ],
    },
    {
      title: "정보",
      links: [
        { label: "추정 방식 안내", href: "/about" },
        { label: "문의하기", href: "/support" },
      ],
    },
  ];

  return (
    <footer className="mt-[var(--space-20)] bg-[var(--teal-900)] text-[var(--teal-100)]">
      <div className="eco-container grid grid-cols-1 gap-[var(--space-10)] py-[var(--space-12)] md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="mb-[10px] font-brand text-[24px] font-black text-white">에코 체크</p>
          <p className="max-w-[340px] text-[17px] leading-[1.7] text-[var(--teal-300)]">
            건물 에너지 등급부터 절감 방법, 지원사업까지 — 에코 체크 하나로 다 확인하세요.
          </p>
        </div>

        {linkGroups.map((group) => (
          <div key={group.title}>
            <h2 className="mb-[var(--space-3)] font-sans text-[17px] font-bold tracking-normal text-white">
              {group.title}
            </h2>
            <ul className="flex flex-col gap-[10px]">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-[17px] text-[var(--teal-300)] hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--teal-800)]">
        <p className="eco-container py-[var(--space-5)] text-[17px] text-[var(--teal-300)]">
          추정 등급은 공공 데이터를 기반으로 산정한 참고값이며, 공식 에너지효율등급 인증을 대체하지 않습니다.
        </p>
      </div>
    </footer>
  );
}

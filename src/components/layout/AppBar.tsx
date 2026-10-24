import Image from "next/image";
import Link from "next/link";
import { getUserAccount } from "../../data/account";
import { ButtonLink } from "../ui/ButtonLink";
import { Icon } from "../ui/icons";
import { AppBarNav } from "./AppBarNav";
import { MobileNav } from "./MobileNav";

/**
 * Sticky site header: brand mark, primary nav (에너지 성적표 · 절감 하기 ·
 * 지원사업 · 서비스 소개), and notification/login actions. Below `lg` the nav
 * and actions collapse into `MobileNav`'s disclosure menu.
 */
export async function AppBar() {
  const { primaryBuildingId } = await getUserAccount();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]">
      <div className="eco-container flex h-[var(--app-bar-height)] items-center gap-[var(--space-8)]">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-[var(--space-3)] rounded-[var(--radius-sm)]"
          aria-label="에코 체크 홈으로 이동"
        >
          <Image
            src="/assets/logo-mark.png"
            alt=""
            width={52}
            height={52}
            preload
            className="h-11 w-11 lg:h-[52px] lg:w-[52px]"
          />
          <span className="whitespace-nowrap font-brand text-[22px] font-black tracking-[var(--tracking-tight)] text-[var(--text-strong)] lg:text-[26px]">
            에코 체크
          </span>
        </Link>

        <AppBarNav defaultBuildingId={primaryBuildingId} className="hidden flex-1 lg:flex" />

        <div className="ml-auto hidden shrink-0 items-center gap-[var(--space-3)] lg:flex">
          <Link
            href="/mypage/notifications"
            aria-label="알림"
            title="알림"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-strong)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--surface-sunken)]"
          >
            <Icon name="bell" size={20} />
          </Link>
          <ButtonLink href="/login" variant="secondary" size="md">
            로그인
          </ButtonLink>
        </div>

        <MobileNav defaultBuildingId={primaryBuildingId} />
      </div>
    </header>
  );
}

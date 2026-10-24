import type { NavItem } from "./nav-types";

const BUILDING_ROUTE = /^\/(?:report|guide)\/([^/]+)/;

function isWithin(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Site-wide primary navigation. "에너지 성적표" returns to the last search
 * results (`reportHref`, see `useLastSearchHref`). "절감 하기" is scoped to a
 * building, so it follows the building currently in the URL
 * (`/report/:id`, `/guide/:id`) and falls back to the signed-in user's
 * primary building everywhere else.
 */
export function buildSiteNav(pathname: string, defaultBuildingId: string, reportHref: string): NavItem[] {
  const buildingId = BUILDING_ROUTE.exec(pathname)?.[1] ?? defaultBuildingId;
  return [
    {
      label: "에너지 성적표",
      href: reportHref,
      active: isWithin(pathname, "/report") || isWithin(pathname, "/search"),
    },
    { label: "개선하기", href: `/guide/${buildingId}`, active: isWithin(pathname, "/guide") },
    { label: "지원사업", href: "/programs", active: isWithin(pathname, "/programs") },
    { label: "서비스 소개", href: "/about", active: isWithin(pathname, "/about") },
  ];
}

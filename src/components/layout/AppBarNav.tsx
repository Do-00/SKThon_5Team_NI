"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../ui/utils";
import { useLastSearchHref } from "../../lib/last-search";
import { buildSiteNav } from "./site-nav";

export interface AppBarNavProps {
  /** Building the building-scoped links point at when the URL doesn't name one. */
  defaultBuildingId: string;
  className?: string;
}

/**
 * Desktop primary nav. A Client Component only so it can read the current
 * route with `usePathname()` and mark the active item — `AppBar` itself
 * stays a Server Component.
 */
export function AppBarNav({ defaultBuildingId, className }: AppBarNavProps) {
  const pathname = usePathname();
  const items = buildSiteNav(pathname, defaultBuildingId, useLastSearchHref());

  return (
    <nav aria-label="주요 메뉴" className={cn("items-center gap-[var(--space-2)]", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className="inline-flex h-14 items-center whitespace-nowrap rounded-[var(--radius-md)] px-[18px] font-brand text-[18px] font-bold text-[var(--text-body)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-strong)] aria-[current=page]:bg-[var(--surface-brand-soft)] aria-[current=page]:text-[var(--teal-800)]"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../ui/icons";
import { useLastSearchHref } from "../../lib/last-search";
import { buildSiteNav } from "./site-nav";

export interface MobileNavProps {
  /** Building the building-scoped links point at when the URL doesn't name one. */
  defaultBuildingId: string;
}

/**
 * Accessible disclosure menu for narrow viewports: a toggle button that
 * expands a panel listing the same links `AppBar` renders in its desktop
 * nav, plus the notification/login actions. Client Component for
 * open/close state, outside-click and Escape handling, and `usePathname()`.
 */
export function MobileNav({ defaultBuildingId }: MobileNavProps) {
  const pathname = usePathname();
  const items = buildSiteNav(pathname, defaultBuildingId, useLastSearchHref());
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current && !panelRef.current.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="ml-auto lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] text-[var(--text-strong)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--surface-sunken)]"
      >
        <span className="sr-only">{open ? "메뉴 닫기" : "메뉴 열기"}</span>
        <Icon name={open ? "close" : "menu"} size={20} />
      </button>

      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-sheet)]"
      >
        <nav aria-label="모바일 메뉴" className="eco-container flex flex-col gap-[var(--space-1)] py-[var(--space-3)]">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              onClick={close}
              className="rounded-[var(--radius-md)] px-[var(--space-4)] py-[var(--space-3)] font-brand text-[18px] font-bold text-[var(--text-body)] hover:bg-[var(--surface-sunken)] aria-[current=page]:bg-[var(--surface-brand-soft)] aria-[current=page]:text-[var(--teal-800)]"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-[var(--space-2)] grid grid-cols-2 gap-[var(--space-2)] border-t border-[var(--border-subtle)] pt-[var(--space-3)]">
            <Link
              href="/mypage/notifications"
              onClick={close}
              className="inline-flex h-11 items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] text-[length:var(--text-label-size)] font-bold text-[var(--text-strong)] hover:bg-[var(--surface-sunken)]"
            >
              <Icon name="bell" size={18} />
              알림
            </Link>
            <Link
              href="/login"
              onClick={close}
              className="inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] text-[length:var(--text-label-size)] font-bold text-[var(--text-strong)] hover:bg-[var(--surface-sunken)]"
            >
              로그인
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}

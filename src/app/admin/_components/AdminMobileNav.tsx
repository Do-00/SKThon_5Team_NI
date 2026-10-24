"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "../../../components/ui";
import type { AdminNavEntry } from "../_lib/nav";

export interface AdminMobileNavProps {
  items: readonly AdminNavEntry[];
  activeHref: string;
}

/**
 * Client island — the admin section's only interactive nav piece: a
 * disclosure toggle that reveals the dark sidebar links on narrow
 * viewports. Mirrors the accessible pattern already used by the shared
 * `MobileNav` (Escape to close, outside-click to close), kept local to
 * `src/app/admin/**` since the shared component is styled for the light
 * app bar rather than the admin's dark teal chrome.
 */
export function AdminMobileNav({ items, activeHref }: AdminMobileNavProps) {
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

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--teal-700)] text-[var(--paper)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--teal-800)]"
      >
        <span className="sr-only">{open ? "관리자 메뉴 닫기" : "관리자 메뉴 열기"}</span>
        <Icon name={open ? "close" : "menu"} size={20} />
      </button>

      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        className="absolute inset-x-0 top-full z-40 border-b border-[var(--teal-700)] bg-[var(--teal-900)] shadow-[var(--shadow-sheet)]"
      >
        <nav aria-label="관리자 모바일 메뉴" className="flex flex-col gap-[var(--space-1)] px-[var(--gutter-screen)] py-[var(--space-3)]">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === activeHref ? "page" : undefined}
              onClick={() => setOpen(false)}
              className="flex items-center gap-[var(--space-3)] rounded-[var(--radius-sm)] px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-label-size)] font-medium text-[var(--teal-100)] hover:bg-[var(--teal-800)] aria-[current=page]:bg-[var(--teal-700)] aria-[current=page]:text-[var(--paper)]"
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

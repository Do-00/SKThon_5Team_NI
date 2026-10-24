"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./utils";
import { IconButton } from "./IconButton";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Clicking the overlay backdrop closes the dialog. Defaults to true. */
  closeOnOverlayClick?: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Client Component — accessible modal dialog. Implements the full pattern
 * by hand (no dependency): focus trap, Escape-to-close, focus returned to
 * the trigger on close, body scroll lock while open, and a portal to
 * `document.body` for correct stacking.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  closeOnOverlayClick = true,
}: DialogProps) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descId = description ? `${generatedId}-description` : undefined;
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const initialFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (initialFocusable ?? panel)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousActiveElement.current?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[var(--space-4)]">
      <div
        aria-hidden="true"
        onClick={closeOnOverlayClick ? () => onClose() : undefined}
        className="absolute inset-0 bg-[rgb(20_32_30_/_55%)] transition-opacity duration-[var(--dur-base)] ease-[var(--ease-standard)]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className={cn(
          "relative z-10 flex max-h-[85vh] w-full max-w-[480px] flex-col gap-[var(--space-4)] overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-[var(--pad-section)] shadow-[var(--shadow-overlay)]",
          className
        )}
      >
        <div className="flex items-start justify-between gap-[var(--space-4)]">
          <div className="flex flex-col gap-[var(--space-1)]">
            <h2 id={titleId} className="eco-subhead text-[var(--text-strong)]">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="text-[var(--text-caption-size)] text-[var(--text-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton icon="close" label="Close dialog" variant="ghost" size="sm" onClick={onClose} />
        </div>
        {children}
        {footer ? (
          <div className="flex items-center justify-end gap-[var(--space-3)]">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

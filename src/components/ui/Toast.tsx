"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./utils";
import { Icon, type IconName } from "./icons";

export type ToastTone = "neutral" | "good" | "warn" | "danger";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Auto-dismiss delay in ms. Pass 0 to keep the toast until dismissed manually. Defaults to 5000. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  show: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Read inside any descendant of `ToastProvider` to trigger toasts. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a <ToastProvider>");
  return ctx;
}

const TONE_CLASSES: Record<ToastTone, string> = {
  neutral: "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-strong)]",
  good: "border-[var(--status-good)] bg-[var(--status-good-soft)] text-[var(--status-good)]",
  warn: "border-[var(--status-warn)] bg-[var(--status-warn-soft)] text-[var(--status-warn)]",
  danger: "border-[var(--status-danger)] bg-[var(--status-danger-soft)] text-[var(--status-danger)]",
};

const TONE_ICON: Record<ToastTone, IconName> = {
  neutral: "info",
  good: "check",
  warn: "info",
  danger: "close",
};

let toastSeq = 0;

const noopSubscribe = () => () => {};

/** True once on the client, false during SSR — via `useSyncExternalStore` so no render-triggering `setState` is needed in an effect. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

/**
 * Client Component — Toast provider + live region. Wrap the app (or a
 * subtree) once with `<ToastProvider>`, then call `useToast().show(...)`
 * anywhere below it. Toasts render via a `document.body` portal and use
 * `role="status"`/`role="alert"` with `aria-live` so screen readers
 * announce them automatically.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const mounted = useIsClient();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((timer) => clearTimeout(timer));
      timersMap.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = `toast-${++toastSeq}`;
      const duration = options.duration ?? 5000;
      setToasts((current) => [...current, { ...options, id }]);
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        );
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-[var(--space-4)] z-[100] flex flex-col items-center gap-[var(--space-2)] px-[var(--space-4)] sm:left-auto sm:right-[var(--space-4)] sm:items-end">
              <div
                role="region"
                aria-label="Notifications"
                className="flex w-full max-w-[380px] flex-col gap-[var(--space-2)]"
              >
                {toasts.map((toast) => {
                  const tone = toast.tone ?? "neutral";
                  return (
                    <div
                      key={toast.id}
                      role={tone === "danger" ? "alert" : "status"}
                      aria-live={tone === "danger" ? "assertive" : "polite"}
                      aria-atomic="true"
                      className={cn(
                        "pointer-events-auto flex items-start gap-[var(--space-3)] rounded-[var(--radius-md)] border p-[var(--space-4)] shadow-[var(--shadow-raised)]",
                        TONE_CLASSES[tone]
                      )}
                    >
                      <Icon name={TONE_ICON[tone]} size={18} className="mt-[2px] shrink-0" />
                      <div className="flex flex-1 flex-col gap-[2px]">
                        <p className="text-[var(--text-label-size)] font-[var(--weight-bold)]">
                          {toast.title}
                        </p>
                        {toast.description ? (
                          <p className="text-[var(--text-caption-size)] opacity-90">
                            {toast.description}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-label="Dismiss notification"
                        onClick={() => dismiss(toast.id)}
                        className="shrink-0 rounded-[var(--radius-sm)] p-[2px] text-current opacity-70 hover:opacity-100"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
}

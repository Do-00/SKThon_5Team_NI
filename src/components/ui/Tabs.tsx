"use client";

import { createContext, useCallback, useContext, useEffect, useId, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "./utils";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
  registerTab: (value: string) => void;
  unregisterTab: (value: string) => void;
  tabOrder: string[];
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> must be rendered inside <Tabs>`);
  return ctx;
}

export interface TabsProps {
  /** Initial active tab value for uncontrolled usage. */
  defaultValue?: string;
  /** Controlled active tab value. */
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

/**
 * Client Component — accessible tabs (WAI-ARIA Tabs pattern) with roving
 * tabindex and Left/Right/Home/End keyboard navigation. Composed from
 * `Tabs` > `TabList` > `Tab` + `TabPanel`.
 */
export function Tabs({ defaultValue, value: controlledValue, onValueChange, children, className }: TabsProps) {
  const baseId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const [tabOrder, setTabOrder] = useState<string[]>([]);
  // If nothing has been explicitly selected yet, derive the active tab from
  // the first registered one — computed during render rather than synced
  // via an effect, so there's no extra setState-driven render pass.
  const value = controlledValue ?? (uncontrolledValue || tabOrder[0] || "");

  const setValue = useCallback(
    (next: string) => {
      if (controlledValue === undefined) setUncontrolledValue(next);
      onValueChange?.(next);
    },
    [controlledValue, onValueChange]
  );

  // Tabs register/unregister themselves from an effect (post-render), so
  // `tabOrder` is plain reactive state rather than a ref read during render.
  const registerTab = useCallback((tabValue: string) => {
    setTabOrder((current) => (current.includes(tabValue) ? current : [...current, tabValue]));
  }, []);

  const unregisterTab = useCallback((tabValue: string) => {
    setTabOrder((current) => current.filter((existing) => existing !== tabValue));
  }, []);

  return (
    <TabsContext.Provider value={{ value, setValue, baseId, registerTab, unregisterTab, tabOrder }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function TabList({ children, className, "aria-label": ariaLabel }: TabListProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-[var(--space-1)] rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-[var(--space-1)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Tab({ value, children, disabled, className }: TabProps) {
  const { value: activeValue, setValue, baseId, registerTab, unregisterTab, tabOrder } =
    useTabsContext("Tab");

  useEffect(() => {
    registerTab(value);
    return () => unregisterTab(value);
  }, [value, registerTab, unregisterTab]);

  const isActive = activeValue === value;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const order = tabOrder;
    const currentIndex = order.indexOf(value);

    if (order.length === 0 || currentIndex < 0) return;

    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % order.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + order.length) % order.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = order.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      const nextValue = order[nextIndex];
      setValue(nextValue);
      document.getElementById(`${baseId}-tab-${nextValue}`)?.focus();
    }
  }

  return (
    <button
      id={`${baseId}-tab-${value}`}
      role="tab"
      type="button"
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => setValue(value)}
      onKeyDown={handleKeyDown}
      className={cn(
        "rounded-[var(--radius-sm)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--text-label-size)] font-[var(--weight-medium)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-[var(--surface-card)] text-[var(--text-strong)] shadow-[var(--shadow-card)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-strong)]",
        className
      )}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { value: activeValue, baseId } = useTabsContext("TabPanel");
  if (activeValue !== value) return null;

  return (
    <div
      id={`${baseId}-panel-${value}`}
      role="tabpanel"
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}

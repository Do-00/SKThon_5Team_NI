"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Guarded `localStorage`-backed checklist completion state, keyed by
 * building id. Guards every access for SSR (no `window`), private-browsing
 * mode (storage APIs throwing on read/write), and malformed stored JSON.
 *
 * Uses `useSyncExternalStore` (the same pattern `Toast.tsx`'s `useIsClient`
 * uses) rather than an effect + `setState`: the server/first-client-paint
 * snapshot is always the empty object, so there's no hydration mismatch, and
 * the real value is picked up as soon as React re-renders on the client —
 * no synchronous `setState` inside an effect body.
 *
 * Shared between `/guide/[buildingId]` (writes completion state) and
 * `/report/[buildingId]` (reads it read-only to project "개선 후" numbers) —
 * moved out of `guide`'s route-local `_lib` since it's no longer guide-only.
 */

const EMPTY_COMPLETED: Record<string, boolean> = {};

/** Per-key cache so `getSnapshot` returns a referentially stable value when the underlying string hasn't changed. */
const snapshotCache = new Map<string, { raw: string | null; value: Record<string, boolean> }>();

const changeListeners = new Set<() => void>();

function safeGetItem(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, raw: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, raw);
  } catch {
    // Storage disabled (private browsing) or quota exceeded — completion still works for this session.
  }
}

function parseCompleted(raw: string | null): Record<string, boolean> {
  if (!raw) return EMPTY_COMPLETED;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return EMPTY_COMPLETED;
    const next: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "boolean") next[key] = value;
    }
    return next;
  } catch {
    return EMPTY_COMPLETED;
  }
}

function getSnapshot(storageKey: string): Record<string, boolean> {
  const raw = safeGetItem(storageKey);
  const cached = snapshotCache.get(storageKey);
  if (cached && cached.raw === raw) return cached.value;
  const value = parseCompleted(raw);
  snapshotCache.set(storageKey, { raw, value });
  return value;
}

function getServerSnapshot(): Record<string, boolean> {
  return EMPTY_COMPLETED;
}

function subscribe(onStoreChange: () => void): () => void {
  changeListeners.add(onStoreChange);
  const handleStorageEvent = () => onStoreChange();
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
  }
  return () => {
    changeListeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

function notifyChange(): void {
  changeListeners.forEach((listener) => listener());
}

export function useChecklistStorage(buildingId: string) {
  const storageKey = `eco-check:guide-checklist:${buildingId}`;

  const completed = useSyncExternalStore(
    subscribe,
    () => getSnapshot(storageKey),
    getServerSnapshot,
  );
  // True once the client snapshot (as opposed to the SSR-matching empty
  // snapshot) has been read at least once.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const toggle = useCallback(
    (actionId: string) => {
      const current = getSnapshot(storageKey);
      const next = { ...current, [actionId]: !current[actionId] };
      const raw = JSON.stringify(next);
      snapshotCache.set(storageKey, { raw, value: next });
      safeSetItem(storageKey, raw);
      notifyChange();
    },
    [storageKey],
  );

  return { completed, toggle, hydrated };
}

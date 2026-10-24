import { useSyncExternalStore } from "react";

/**
 * Remembers the last address the user searched (per tab, in sessionStorage)
 * so "에너지 성적표" in the site nav can bring them back to those results
 * (`/search?q=…`) after they wander off to another page.
 */

const STORAGE_KEY = "eco:last-search-query";
const CHANGE_EVENT = "eco:last-search-change";

/**
 * `buildingName`/`roadAddress` ride along as `&bn=`/`&ra=` — `/api/match`
 * only matches by 지번 (`query`), but the separate 아파트 API has no 지번 field
 * at all, only name and 도로명. Kakao often leaves `buildingName` blank for a
 * plain address pick, so `roadAddress` is the more reliable of the two —
 * `/search` tries both, on whichever field each backend actually indexes.
 */
export function searchHref(query: string | null | undefined, buildingName?: string, roadAddress?: string): string {
  if (!query) return "/search";
  const params = new URLSearchParams({ q: query });
  if (buildingName?.trim()) params.set("bn", buildingName.trim());
  if (roadAddress?.trim()) params.set("ra", roadAddress.trim());
  return `/search?${params.toString()}`;
}

export function rememberLastSearch(query: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, query);
  } catch {
    return; // Storage blocked (private mode, sandbox) — the nav just falls back to "/search".
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readLastSearch(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/** `/search?q=<last query>`, or `/search` before any search (and during SSR). */
export function useLastSearchHref(): string {
  const query = useSyncExternalStore(subscribe, readLastSearch, () => null);
  return searchHref(query);
}

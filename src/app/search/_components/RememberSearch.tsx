"use client";

import { useEffect } from "react";
import { rememberLastSearch } from "@/src/lib/last-search";

/** Records the current `/search?q=` so the nav's "에너지 성적표" link returns here. Renders nothing. */
export function RememberSearch({ query }: { query: string }) {
  useEffect(() => {
    rememberLastSearch(query);
  }, [query]);
  return null;
}

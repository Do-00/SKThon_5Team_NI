const FALLBACK_PATH = "/mypage";

/**
 * Sanitizes a `next` redirect target coming from the URL query string so it
 * can only ever point at a relative, same-origin path. This blocks classic
 * open-redirect vectors: absolute URLs (`https://evil.example`),
 * protocol-relative URLs (`//evil.example`), backslash tricks that browsers
 * normalize into `//evil.example` (`/\evil.example`), and values carrying a
 * URL scheme (`javascript:...`).
 *
 * Falls back to `/mypage` for anything that isn't a safe relative path.
 */
export function sanitizeNextPath(raw: string | null | undefined): string {
  if (!raw) return FALLBACK_PATH;

  const trimmed = raw.trim();
  if (!trimmed) return FALLBACK_PATH;

  // Browsers resolve backslashes as forward slashes, so `/\evil.example`
  // would otherwise slip past a naive "starts with a single /" check.
  const normalized = trimmed.replace(/\\/g, "/");

  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return FALLBACK_PATH;
  }

  // Reject anything carrying an explicit URL scheme.
  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized)) {
    return FALLBACK_PATH;
  }

  try {
    const resolved = new URL(normalized, "http://eco-check.local");
    if (resolved.origin !== "http://eco-check.local") {
      return FALLBACK_PATH;
    }
    const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    if (!path.startsWith("/") || path.startsWith("//")) {
      return FALLBACK_PATH;
    }
    return path;
  } catch {
    return FALLBACK_PATH;
  }
}

/** Default destination after a successful login/signup, when `next` is absent or unsafe. */
export const AUTH_REDIRECT_FALLBACK = FALLBACK_PATH;

/** Builds an href for a sibling auth route, forwarding a sanitized `next` param. */
export function withNextQuery(pathname: string, next: string | null | undefined): string {
  if (!next) return pathname;
  const sanitized = sanitizeNextPath(next);
  const params = new URLSearchParams({ next: sanitized });
  return `${pathname}?${params.toString()}`;
}

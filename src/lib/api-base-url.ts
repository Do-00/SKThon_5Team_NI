/**
 * Base URL of the beec Spring Boot backend, readable from both server and
 * browser code (`NEXT_PUBLIC_` vars are inlined into the client bundle at
 * build time — a change here needs a dev-server restart / redeploy).
 *
 * Two names are accepted because the repo's `.env.local` uses
 * `NEXT_PUBLIC_BEEC_API_BASE_URL` while this module was written against
 * `NEXT_PUBLIC_API_BASE_URL`. Locally the mismatch was invisible — both
 * missing means the localhost fallback below, which is what we were running
 * — but on Vercel it would have silently pointed every API call at
 * `localhost:8080` on the *visitor's* machine. Read both, prefer the
 * explicit one.
 *
 * `process.env.X` must be written out in full on each line: Next inlines
 * these by literal text match, so a computed lookup would come back
 * undefined in the browser bundle.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_BEEC_API_BASE_URL ??
  "http://localhost:8080";

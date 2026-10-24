/**
 * Packs an address into a route-safe `/report/[buildingId]` segment and back.
 * beec has no persistent building ids, only address matching, so the id *is*
 * the address (UTF-8 → base64url). Uses `btoa`/`TextEncoder` rather than
 * Node's `Buffer` so the home hero can build report links in the browser;
 * the output is byte-for-byte what `Buffer#toString("base64url")` produced.
 */

/** Prefix marking a building id as a live beec match rather than a fixture id like `"bld-001"`. */
const ADDRESS_ID_PREFIX = "addr-";

/** Prefix marking an id as a 용도·지역·규모 estimate (`/api/report`) for an address beec has no 실측 record for. */
const ESTIMATE_ID_PREFIX = "est-";

/**
 * Separates the address from the Kakao 건물명 inside an `addr-` id. Addresses
 * never contain a newline, and ids made before the name was packed in still
 * decode to just the address.
 */
const NAME_SEPARATOR = "\n";

function toBase64url(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(encoded: string): string | null {
  try {
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * `buildingName` (the Kakao 건물명) is packed in too, so every page that
 * re-queries `/api/match` from the id — report, guide, saved summary — picks
 * the same building on lots that have several.
 */
export function encodeAddressId(address: string, buildingName?: string): string {
  const name = buildingName?.trim();
  return `${ADDRESS_ID_PREFIX}${toBase64url(name ? `${address}${NAME_SEPARATOR}${name}` : address)}`;
}

export interface AddressIdParts {
  address: string;
  buildingName?: string;
}

/** Unpacks an `encodeAddressId` id into its address and optional 건물명, or `null` for a fixture id or malformed input. */
export function decodeAddressIdParts(id: string): AddressIdParts | null {
  if (!id.startsWith(ADDRESS_ID_PREFIX)) return null;
  const decoded = fromBase64url(id.slice(ADDRESS_ID_PREFIX.length));
  if (decoded === null) return null;
  const [address, buildingName] = decoded.split(NAME_SEPARATOR, 2);
  return buildingName ? { address, buildingName } : { address };
}

/** Unpacks an `encodeAddressId` id back to the original address, or `null` for a fixture id or malformed input. */
export function decodeAddressId(id: string): string | null {
  return decodeAddressIdParts(id)?.address ?? null;
}

/** What an `est-` id carries: the searched address plus the 용도·지역·규모 the user picked for `/api/report`. */
export interface EstimateIdParts {
  address: string;
  purpose: string;
  region: string;
  sizeBucket: string;
}

export function encodeEstimateId({ address, purpose, region, sizeBucket }: EstimateIdParts): string {
  return `${ESTIMATE_ID_PREFIX}${toBase64url(JSON.stringify([address, purpose, region, sizeBucket]))}`;
}

/** Unpacks an `encodeEstimateId` id, or `null` for any other id or malformed input. */
export function decodeEstimateId(id: string): EstimateIdParts | null {
  if (!id.startsWith(ESTIMATE_ID_PREFIX)) return null;
  const decoded = fromBase64url(id.slice(ESTIMATE_ID_PREFIX.length));
  if (decoded === null) return null;
  try {
    const parts: unknown = JSON.parse(decoded);
    if (!Array.isArray(parts) || parts.length !== 4 || !parts.every((part) => typeof part === "string")) {
      return null;
    }
    const [address, purpose, region, sizeBucket] = parts as string[];
    return { address, purpose, region, sizeBucket };
  } catch {
    return null;
  }
}

/**
 * Framework-agnostic formatting helpers for the Eco Check prototype.
 *
 * Every function here is a pure, synchronous transform on primitive values
 * (no Date/Intl side effects that could diverge between server and client
 * rendering), so they are safe to call from Server Components, Client
 * Components, or plain TypeScript modules alike.
 */

const KOREAN_LOCALE = "ko-KR";

/** Formats a plain number with Korean-style thousands separators, e.g. `12480` -> `"12,480"`. */
export function formatNumber(value: number): string {
  return value.toLocaleString(KOREAN_LOCALE);
}

/** Formats a value already expressed in 만원 (10,000 KRW) units, e.g. `142` -> `"142만원"`. */
export function formatManwon(value: number): string {
  return `${formatNumber(value)}만원`;
}

/** Formats a raw KRW amount by first converting it into 만원 units, e.g. `1420000` -> `"142만원"`. */
export function formatWonAsManwon(value: number): string {
  return formatManwon(Math.round(value / 10_000));
}

export interface FormatPercentOptions {
  /** Prefix positive values with a "+" sign. Defaults to `false`. */
  signed?: boolean;
  /** Number of digits after the decimal point. Defaults to `0` for integers, `1` otherwise. */
  fractionDigits?: number;
}

/** Formats a percentage value, e.g. `31` -> `"31%"`, `-4.2` -> `"-4.2%"`. */
export function formatPercent(value: number, options: FormatPercentOptions = {}): string {
  const fractionDigits = options.fractionDigits ?? (Number.isInteger(value) ? 0 : 1);
  const sign = options.signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

/** Formats a carbon emission/reduction value in metric tons of CO2, e.g. `3.6` -> `"3.6 tCO₂"`. */
export function formatTonsCO2(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)} tCO₂`;
}

/** Formats a distance in meters, switching to kilometers once it reaches 1,000m. */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${formatNumber(Math.round(meters))}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Formats an ISO 8601 date string as `YYYY.MM.DD`.
 *
 * Deliberately avoids `Intl`/`toLocaleDateString` so the output is identical
 * on the server and the client regardless of runtime locale configuration.
 * Falls back to the raw input when it cannot be parsed as a date.
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

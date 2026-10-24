export type ClassValue =
  | string
  | number
  | null
  | boolean
  | undefined
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

function pushClass(value: ClassValue, out: string[]): void {
  if (!value && value !== 0) return;

  if (typeof value === "string" || typeof value === "number") {
    out.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) pushClass(item, out);
    return;
  }

  if (typeof value === "object") {
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key) && value[key]) {
        out.push(key);
      }
    }
  }
}

/**
 * Lightweight `clsx`-style className combinator. No external dependency.
 * Accepts strings, numbers, arrays, and `{ [className]: boolean }` maps,
 * skipping falsy values.
 */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) pushClass(value, out);
  return out.join(" ");
}

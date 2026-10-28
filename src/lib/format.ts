/**
 * Number / time formatters copied from the live app's behaviour.
 */

/** Intl number format; returns "0" for 0 and "" for empty values (live behaviour). */
export function formatNumber(value: number | null | undefined, locale = "en-US", options: Intl.NumberFormatOptions = {}) {
  if (value === 0) return "0";
  if (!value) return "";
  return new Intl.NumberFormat(locale, options).format(value);
}

function toFinite(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** "$1,234.50" ("$0" for zero, "--" when missing). */
export function formatMoney(value: unknown) {
  const n = toFinite(value);
  return n === null ? "--" : `$${formatNumber(n, "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Plain count, e.g. projects worked. */
export function formatCount(value: unknown) {
  const n = toFinite(value);
  return n === null ? "--" : formatNumber(n);
}

/** "12.34%" */
export function formatPercent(value: unknown) {
  const n = toFinite(value);
  return n === null ? "--" : `${n.toFixed(2)}%`;
}

/** 3725 -> "01:02:05" */
export function secondsToHMS(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** 3725 -> "01:02" */
export function secondsToHM(totalSeconds: number, padHours = true) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${padHours ? String(h).padStart(2, "0") : h}:${String(m).padStart(2, "0")}`;
}

/**
 * Display name for an app / URL, same rules as the live app:
 * URLs are lower-cased; apps lose a short file extension (".exe", ".app") and are Title Cased.
 */
export function displayAppName(name: string, type: "app" | "url") {
  if (type === "url") return name.toLowerCase();
  let n = name;
  const dot = n.lastIndexOf(".");
  if (dot !== -1 && /^[a-zA-Z]{2,5}$/.test(n.slice(dot + 1))) n = n.slice(0, dot);
  return n.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Time-zone helpers for the mock API (dayjs + utc/timezone plugins, backed by Intl).
 * Every stored time is a UTC epoch (ms); responses render it in the requested `timezone_str` / `timezone`.
 */
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export { dayjs };

export const DEFAULT_TZ = "America/New_York";

/** Falls back to New York for unknown / empty zone names. */
export function safeTz(tz: string | null | undefined) {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

/* Fast paths with cached Intl formatters (dayjs-tz is too slow for the store build). */
const partsFmt = new Map<string, Intl.DateTimeFormat>();
function fmtParts(tz: string) {
  let f = partsFmt.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: safeTz(tz), hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    partsFmt.set(tz, f);
  }
  return f;
}
/** Wall-clock parts of an epoch in a zone. */
function wall(ms: number, tz: string) {
  const p: Record<string, number> = {};
  for (const x of fmtParts(tz).formatToParts(new Date(ms))) if (x.type !== "literal") p[x.type] = Number(x.value);
  return p;
}
function offsetMsAt(ms: number, tz: string) {
  const p = wall(ms, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return asUtc - (ms - (ms % 1000));
}

/** "2026-10-28" + "09:15:00" in zone → epoch ms. */
export function localToUtcMs(date: string, time: string, tz: string) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi, se = 0] = time.split(":").map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, mi, se);
  let guess = naive - offsetMsAt(naive, tz);
  guess = naive - offsetMsAt(guess, tz);
  return guess;
}

/** Start of the local day (epoch ms). */
export function localDayStartMs(date: string, tz: string) {
  return localToUtcMs(date, "00:00:00", tz);
}

/** Format an epoch in a zone (dayjs format string). */
export function fmtTz(ms: number, tz: string, fmt = "YYYY-MM-DDTHH:mm:ss") {
  return dayjs(ms).tz(safeTz(tz)).format(fmt);
}

/** Local calendar date (YYYY-MM-DD) of an epoch in a zone. */
export function localDate(ms: number, tz: string) {
  const p = wall(ms, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** UTC ISO without zone suffix, like the live API ("2026-10-28T04:05:33"). */
export function utcIso(ms: number) {
  return dayjs(ms).utc().format("YYYY-MM-DDTHH:mm:ss");
}

/** Parse "2026-10-28T04:05:33" / "2026-10-28 04:05:33" / ISO with Z as UTC. */
export function parseUtc(text: string) {
  const t = text.trim().replace(" ", "T");
  return dayjs.utc(/[zZ]|[+-]\d{2}:?\d{2}$/.test(t) ? t : `${t}Z`).valueOf();
}

/** Parse a naive local date-time string in a zone. */
export function parseLocal(text: string, tz: string) {
  return dayjs.tz(text.trim().replace("T", " "), "YYYY-MM-DD HH:mm:ss", safeTz(tz)).valueOf();
}

export function offsetMinutes(tz: string, at = Date.now()) {
  return dayjs(at).tz(safeTz(tz)).utcOffset();
}

/** Short zone label as Intl renders it (e.g. "EDT", "GMT+8"). */
export function tzAbbreviation(tz: string, at = Date.now()) {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: safeTz(tz), timeZoneName: "short" }).formatToParts(new Date(at)).find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

export interface TimezoneRow {
  id: number;
  name: string;
  alternative_name: string;
  continent_code: string;
  continent_name: string;
  country_name: string;
  country_code: string;
  raw_offset_in_minutes: number;
  abbreviation: string;
}

/** Subset of the live GET /get-timezone list (the live one has ~600 rows; same row shape). */
const ZONES: [name: string, alt: string, cc: string, country: string, continent: string, abbr: string][] = [
  ["Pacific/Honolulu", "Hawaii-Aleutian Time", "US", "United States", "NA", "HST"],
  ["America/Anchorage", "Alaska Time", "US", "United States", "NA", "AKST"],
  ["America/Los_Angeles", "Pacific Time", "US", "United States", "NA", "PST"],
  ["America/Vancouver", "Pacific Time", "CA", "Canada", "NA", "PST"],
  ["America/Denver", "Mountain Time", "US", "United States", "NA", "MST"],
  ["America/Phoenix", "Mountain Time", "US", "United States", "NA", "MST"],
  ["America/Chicago", "Central Time", "US", "United States", "NA", "CST"],
  ["America/Mexico_City", "Central Time", "MX", "Mexico", "NA", "CST"],
  ["America/New_York", "Eastern Time", "US", "United States", "NA", "EST"],
  ["America/Toronto", "Eastern Time", "CA", "Canada", "NA", "EST"],
  ["America/Bogota", "Colombia Time", "CO", "Colombia", "SA", "COT"],
  ["America/Lima", "Peru Time", "PE", "Peru", "SA", "PET"],
  ["America/Halifax", "Atlantic Time", "CA", "Canada", "NA", "AST"],
  ["America/Sao_Paulo", "Brasilia Time", "BR", "Brazil", "SA", "BRT"],
  ["America/Argentina/Buenos_Aires", "Argentina Time", "AR", "Argentina", "SA", "ART"],
  ["Atlantic/Azores", "Azores Time", "PT", "Portugal", "EU", "AZOT"],
  ["Africa/Abidjan", "Greenwich Mean Time", "CI", "Ivory Coast", "AF", "GMT"],
  ["Europe/London", "Greenwich Mean Time", "GB", "United Kingdom", "EU", "GMT"],
  ["Europe/Lisbon", "Western European Time", "PT", "Portugal", "EU", "WET"],
  ["Africa/Lagos", "West Africa Time", "NG", "Nigeria", "AF", "WAT"],
  ["Europe/Berlin", "Central European Time", "DE", "Germany", "EU", "CET"],
  ["Europe/Madrid", "Central European Time", "ES", "Spain", "EU", "CET"],
  ["Europe/Paris", "Central European Time", "FR", "France", "EU", "CET"],
  ["Europe/Rome", "Central European Time", "IT", "Italy", "EU", "CET"],
  ["Europe/Warsaw", "Central European Time", "PL", "Poland", "EU", "CET"],
  ["Africa/Cairo", "Eastern European Time", "EG", "Egypt", "AF", "EET"],
  ["Africa/Johannesburg", "South Africa Time", "ZA", "South Africa", "AF", "SAST"],
  ["Europe/Athens", "Eastern European Time", "GR", "Greece", "EU", "EET"],
  ["Europe/Kyiv", "Eastern European Time", "UA", "Ukraine", "EU", "EET"],
  ["Europe/Istanbul", "Turkey Time", "TR", "Turkey", "AS", "TRT"],
  ["Africa/Nairobi", "East Africa Time", "KE", "Kenya", "AF", "EAT"],
  ["Asia/Riyadh", "Arabia Time", "SA", "Saudi Arabia", "AS", "AST"],
  ["Asia/Dubai", "Gulf Time", "AE", "United Arab Emirates", "AS", "GST"],
  ["Asia/Karachi", "Pakistan Time", "PK", "Pakistan", "AS", "PKT"],
  ["Asia/Kolkata", "India Time", "IN", "India", "AS", "IST"],
  ["Asia/Kathmandu", "Nepal Time", "NP", "Nepal", "AS", "NPT"],
  ["Asia/Dhaka", "Bangladesh Time", "BD", "Bangladesh", "AS", "BST"],
  ["Asia/Bangkok", "Indochina Time", "TH", "Thailand", "AS", "ICT"],
  ["Asia/Ho_Chi_Minh", "Indochina Time", "VN", "Vietnam", "AS", "ICT"],
  ["Asia/Jakarta", "Western Indonesia Time", "ID", "Indonesia", "AS", "WIB"],
  ["Asia/Manila", "Philippine Time", "PH", "Philippines", "AS", "PST"],
  ["Asia/Singapore", "Singapore Time", "SG", "Singapore", "AS", "SGT"],
  ["Asia/Hong_Kong", "Hong Kong Time", "HK", "Hong Kong", "AS", "HKT"],
  ["Asia/Shanghai", "China Time", "CN", "China", "AS", "CST"],
  ["Asia/Seoul", "Korean Time", "KR", "South Korea", "AS", "KST"],
  ["Asia/Tokyo", "Japan Time", "JP", "Japan", "AS", "JST"],
  ["Australia/Perth", "Western Australia Time", "AU", "Australia", "OC", "AWST"],
  ["Australia/Brisbane", "Eastern Australia Time", "AU", "Australia", "OC", "AEST"],
  ["Australia/Sydney", "Eastern Australia Time", "AU", "Australia", "OC", "AEST"],
  ["Pacific/Auckland", "New Zealand Time", "NZ", "New Zealand", "OC", "NZST"],
  ["UTC", "Coordinated Universal Time", "", "", "", "UTC"],
];

const CONTINENTS: Record<string, string> = { NA: "North America", SA: "South America", EU: "Europe", AF: "Africa", AS: "Asia", OC: "Oceania", "": "" };

export function timezoneListing(): TimezoneRow[] {
  return ZONES.map(([name, alt, cc, country, continent, abbr], i) => ({
    id: 100 + i,
    name,
    alternative_name: alt,
    continent_code: continent,
    continent_name: CONTINENTS[continent] ?? "",
    country_name: country,
    country_code: cc,
    raw_offset_in_minutes: offsetMinutes(name, Date.UTC(2026, 0, 15)),
    abbreviation: abbr,
  }));
}

export function timezoneRow(name: string): TimezoneRow {
  return timezoneListing().find((z) => z.name === name) ?? timezoneListing().find((z) => z.name === DEFAULT_TZ)!;
}

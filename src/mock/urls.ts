/**
 * Activity › URLs (My URLs + All URLs / URL management).
 *
 * URL visits are generated deterministically per member-local day: every URL-type "app" in that
 * day's DayRecord.apps (seed.ts › APPS, e.g. github.com) is split into visits of a few minutes on the
 * fictional pages in seed-activity.ts › URL_PATHS. Visit times and project / task come from the
 * member's time entries of that day, so edits on the Timesheets page change URL data too.
 *
 *   GET /activity/urls/{org}/me           ?start_date&end_date&timezone&limit&offset&search
 *   GET /activity/urls/{org}/view_by_date ?start_date&end_date&user_id
 *   GET /activity/urls/{org}/grid         ?start_date&end_date&mode&limit&offset&search_employee&client_id&team_id&project_id
 *   GET /activity/urls/{org}/admin        ?start_date&end_date&user_id&search&limit&offset
 *   GET /activity/urls/{org}/drilldown    ?date&user_id&date_end&group_by_day&search&limit&offset
 */
import dayjs from "dayjs";
import type { Ctx } from "./engine";
import { DEMO_USER_ID, MEMBERS, PROJECTS } from "./seed";
import { ALERT_DOMAINS, CLIENTS, URL_PATHS } from "./seed-activity";
import { rng } from "./random";
import { getStore, memberOf, type TimeEntry } from "./store";
import { dayAfter, entriesByLocalDate, projectOf } from "./timeline";
import { localDate, localDayStartMs } from "./tz";

export interface UrlVisit {
  domain: string;
  url: string;
  project: string;
  task: string;
  seconds: number;
  /** Epoch ms of the visit (start). */
  at: number;
}

const hms = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** How many visits a domain gets for `seconds` of use (also used for cheap grid counts). */
function visitCount(seconds: number) {
  return Math.max(1, Math.min(18, Math.round(seconds / 380)));
}

function urlDomains(userId: string, date: string) {
  const rec = getStore().records.get(userId)?.get(date);
  return (rec?.apps ?? []).filter((a) => a.type === "url" && a.seconds >= 30);
}

/** Link counts of a day without generating the visits (grid month/year views). */
function dayCounts(userId: string, date: string) {
  let urls = 0;
  let alerts = 0;
  for (const d of urlDomains(userId, date)) {
    const n = visitCount(d.seconds);
    urls += n;
    if (ALERT_DOMAINS.includes(d.name)) alerts += n;
  }
  return { urls, alerts };
}

/** All URL visits of one member-local day (deterministic). */
export function visitsOfDay(userId: string, date: string): UrlVisit[] {
  const member = memberOf(userId);
  if (!member) return [];
  const domains = urlDomains(userId, date);
  if (!domains.length) return [];
  const entries: TimeEntry[] = entriesByLocalDate(userId, date, date, member.timezone).get(date) ?? [];
  const dayStart = localDayStartMs(date, member.timezone);
  const out: UrlVisit[] = [];
  for (const d of domains) {
    const r = rng(`urls:${userId}:${date}:${d.name}`);
    const n = visitCount(d.seconds);
    const paths = URL_PATHS[d.name] ?? ["/"];
    const weights = Array.from({ length: n }, () => 0.3 + r());
    const wsum = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) {
      const e = entries.length ? entries[Math.floor(r() * entries.length)] : undefined;
      const seconds = Math.max(3, Math.round((d.seconds * weights[i]) / wsum));
      const at = e ? e.start + Math.floor(r() * Math.max(1, e.stop - e.start - 1000)) : dayStart + (9 + Math.floor(r() * 8)) * 3600_000;
      out.push({
        domain: d.name,
        url: `https://${d.name}${paths[Math.floor(r() * paths.length)]}`,
        project: e ? (projectOf(e.projectId)?.name ?? "") : (PROJECTS[0]?.name ?? ""),
        task: e?.task ?? "",
        seconds,
        at,
      });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

function matches(v: UrlVisit, search?: string | null) {
  if (!search) return true;
  const s = search.toLowerCase();
  return v.domain.includes(s) || v.url.toLowerCase().includes(s) || v.project.toLowerCase().includes(s) || v.task.toLowerCase().includes(s);
}

/** Group visits by domain (biggest time first) in the live `domains[]` shape. */
function domainsOf(visits: UrlVisit[]) {
  const map = new Map<string, UrlVisit[]>();
  for (const v of visits) map.set(v.domain, [...(map.get(v.domain) ?? []), v]);
  return [...map.entries()]
    .map(([domain, list]) => ({
      domain,
      link_count: list.length,
      total_time: hms(list.reduce((s, v) => s + v.seconds, 0)),
      urls: list.map((v) => ({ url: v.url, project: v.project, task: v.task, time_spent: hms(v.seconds) })),
      _s: list.reduce((s, v) => s + v.seconds, 0),
    }))
    .sort((a, b) => b._s - a._s)
    .map(({ _s, ...d }) => d);
}

const formatted = (date: string) => dayjs(date).format("dddd, MMMM D, YYYY");

function datesBetween(start: string, end: string) {
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 800; d = dayAfter(d)) out.push(d);
  return out;
}

const page = (limit: number, offset: number, total: number) => ({ limit, offset, total_pages: Math.max(1, Math.ceil(total / limit)) });

/* ---------------- My URLs ---------------- */

export function myUrls(ctx: Ctx, q: { start: string; end: string; limit: number; offset: number; search?: string | null; userId?: string }) {
  const userId = q.userId ?? DEMO_USER_ID;
  const days =
    ctx.scenario === "empty"
      ? []
      : datesBetween(q.start, q.end)
          .reverse()
          .map((date) => {
            const v = visitsOfDay(userId, date).filter((x) => matches(x, q.search));
            return { date, date_formatted: formatted(date), url_count: v.length, total_time: hms(v.reduce((s, x) => s + x.seconds, 0)) };
          })
          .filter((d) => d.url_count > 0);
  return { pagination: { total_days: days.length, ...page(q.limit, q.offset, days.length) }, days: days.slice(q.offset, q.offset + q.limit) };
}

export function viewByDate(ctx: Ctx, q: { start: string; end: string; userId?: string | null; search?: string | null }) {
  const userId = q.userId || DEMO_USER_ID;
  if (ctx.scenario === "empty") return { days: [] };
  const days = datesBetween(q.start, q.end)
    .reverse()
    .map((date) => ({ date, domains: domainsOf(visitsOfDay(userId, date).filter((x) => matches(x, q.search))) }))
    .filter((d) => d.domains.length > 0);
  return { days };
}

/* ---------------- All URLs (admin) ---------------- */

export type GridMode = "day" | "week" | "month" | "year";

interface GridSlot {
  urlCount: number;
  alertCount: number;
  status: "active" | "empty" | "upcoming";
}

function memberClientIds(m: (typeof MEMBERS)[number]) {
  return PROJECTS.filter((p) => m.projects.includes(p.id) && p.client).map((p) => CLIENTS.find((c) => c.name === p.client)!.id);
}

export function urlGrid(
  ctx: Ctx,
  q: { start: string; end: string; mode: GridMode; limit: number; offset: number; searchEmployee?: string | null; clientIds: number[]; teamIds: number[]; projectIds: string[] },
) {
  const today = dayjs().format("YYYY-MM-DD");
  let buckets: string[];
  let bucketLabels: string[];
  if (q.mode === "day") {
    buckets = Array.from({ length: 24 }, (_, h) => `${q.start} ${String(h).padStart(2, "0")}:00`);
    bucketLabels = Array.from({ length: 24 }, (_, h) => (h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`));
  } else if (q.mode === "year") {
    buckets = [];
    for (let m = dayjs(q.start).startOf("month"); !m.isAfter(dayjs(q.end), "month"); m = m.add(1, "month")) buckets.push(m.format("YYYY-MM"));
    bucketLabels = buckets.map((b) => dayjs(`${b}-01`).format("MMM"));
  } else {
    buckets = datesBetween(q.start, q.end);
    bucketLabels = buckets.map((b) => dayjs(b).format("ddd"));
  }

  const members = MEMBERS.filter((m) => {
    if (q.searchEmployee && !m.full_name.toLowerCase().includes(q.searchEmployee.toLowerCase())) return false;
    if (q.projectIds.length && !m.projects.some((p) => q.projectIds.includes(p))) return false;
    if (q.teamIds.length && !m.teams.some((t) => q.teamIds.includes(t))) return false;
    if (q.clientIds.length && !memberClientIds(m).some((c) => q.clientIds.includes(c))) return false;
    return true;
  });

  const employees =
    ctx.scenario === "empty"
      ? []
      : members
          .map((m) => {
            const slots: Record<string, GridSlot> = {};
            if (q.mode === "day") {
              const visits = visitsOfDay(m.user_id, q.start);
              buckets.forEach((_, h) => {
                const v = visits.filter((x) => Number(dayjs(x.at).tz(m.timezone).format("H")) === h);
                const alerts = v.filter((x) => ALERT_DOMAINS.includes(x.domain)).length;
                const upcoming = q.start > today || (q.start === today && h > Number(dayjs().tz(m.timezone).format("H")));
                slots[h] = { urlCount: v.length, alertCount: alerts, status: v.length ? "active" : upcoming ? "upcoming" : "empty" };
              });
            } else if (q.mode === "year") {
              buckets.forEach((month, i) => {
                let urls = 0;
                let alerts = 0;
                const first = `${month}-01`;
                const last = dayjs(first).endOf("month").format("YYYY-MM-DD");
                for (const d of datesBetween(first < q.start ? q.start : first, last > q.end ? q.end : last)) {
                  const c = dayCounts(m.user_id, d);
                  urls += c.urls;
                  alerts += c.alerts;
                }
                slots[i] = { urlCount: urls, alertCount: alerts, status: urls ? "active" : month > today.slice(0, 7) ? "upcoming" : "empty" };
              });
            } else {
              buckets.forEach((d, i) => {
                const c = dayCounts(m.user_id, d);
                slots[i] = { urlCount: c.urls, alertCount: c.alerts, status: c.urls ? "active" : d >= today ? "upcoming" : "empty" };
              });
            }
            return { employee_id: m.user_id, employee_name: m.full_name, slots };
          })
          .filter((e) => Object.values(e.slots).some((s) => s.status === "active"));

  return { total: employees.length, buckets, bucketLabels, employees: employees.slice(q.offset, q.offset + q.limit) };
}

export function urlAdmin(ctx: Ctx, q: { start: string; end: string; userId?: string | null; search?: string | null; limit: number; offset: number }) {
  const userId = q.userId || DEMO_USER_ID;
  const days =
    ctx.scenario === "empty"
      ? []
      : datesBetween(q.start, q.end)
          .reverse()
          .map((date) => {
            const v = visitsOfDay(userId, date).filter((x) => matches(x, q.search));
            return { date, date_formatted: formatted(date), url_count: v.length, total_time: hms(v.reduce((s, x) => s + x.seconds, 0)), domains: domainsOf(v) };
          })
          .filter((d) => d.url_count > 0);
  return { pagination: { total_days: days.length, ...page(q.limit, q.offset, days.length) }, days: days.slice(q.offset, q.offset + q.limit) };
}

export function urlDrilldown(ctx: Ctx, q: { date: string; dateEnd?: string | null; userId?: string | null; search?: string | null; limit: number; offset: number }) {
  const userId = q.userId || DEMO_USER_ID;
  const end = q.dateEnd || q.date;
  const days =
    ctx.scenario === "empty"
      ? []
      : datesBetween(q.date, end)
          .reverse()
          .map((date) => ({ date, url_count: q.search ? visitsOfDay(userId, date).filter((x) => matches(x, q.search)).length : dayCounts(userId, date).urls }))
          .filter((d) => d.url_count > 0);
  return { pagination: page(q.limit, q.offset, days.length), days: days.slice(q.offset, q.offset + q.limit) };
}

/** Today's date of a member (used by tests). */
export const memberToday = (userId: string) => localDate(Date.now(), memberOf(userId)?.timezone ?? "America/New_York");

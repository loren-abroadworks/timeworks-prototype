/**
 * Activity › App — GET /application-usage-project/{org}?date&timezone&user_id&project_id
 *
 * Hour by hour (in the requested zone), the tracked seconds of each project come from the member's
 * time entries; they are split across the apps that member used that day (DayRecord.apps mix),
 * deterministically, plus a few seconds of the TimeWorks tracker itself.
 */
import type { Ctx } from "./engine";
import { APPS, DEMO_USER_ID, ORGANIZATION } from "./seed";
import { APP_DISPLAY_NAMES, TRACKER_APP } from "./seed-activity";
import { hashString, rng } from "./random";
import { getStore, memberOf } from "./store";
import { dayAfter, entriesBetween, projectOf } from "./timeline";
import { fmtTz, localDayStartMs, safeTz } from "./tz";

export interface AppUsageApplication {
  application_name: string;
  usage_seconds: number;
  usage_seconds_interval: string;
  project: string;
}

export interface AppUsageProjectBlock {
  total_usage_interval: string;
  applications: AppUsageApplication[];
}

export type AppUsageRecord = { hour_bucket: string } & Record<string, AppUsageProjectBlock | string>;

export interface AppUsageResponse {
  organization_timezone: string;
  records: AppUsageRecord[];
  top_5_applications: { application_name: string; total_usage_interval: string }[];
}

/** 1107 -> "0:18:27" (hours not padded, like the live API). */
export function interval(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const HOUR = 3600_000;

export function applicationUsage(ctx: Ctx, q: { date: string; timezone?: string | null; userId?: string | null; projectId?: string | null }): AppUsageResponse {
  const tz = safeTz(q.timezone);
  const empty: AppUsageResponse = { organization_timezone: ORGANIZATION.time_zone, records: [], top_5_applications: [] };
  const userId = q.userId || DEMO_USER_ID;
  const member = memberOf(userId);
  if (ctx.scenario === "empty" || !member) return empty;

  const store = getStore();
  const rec = store.records.get(userId)?.get(q.date);
  // App mix of that day (type "app"); fall back to the seed weights.
  const mix = (rec?.apps.filter((a) => a.type === "app" && a.seconds > 0) ?? []).map((a) => ({ name: APP_DISPLAY_NAMES[a.name] ?? a.name, w: a.seconds }));
  const apps = mix.length ? mix : APPS.filter((a) => a.type === "app").map((a) => ({ name: APP_DISPLAY_NAMES[a.name] ?? a.name, w: a.weight }));

  const from = localDayStartMs(q.date, tz);
  const to = localDayStartMs(dayAfter(q.date), tz);
  const entries = entriesBetween(userId, from, to, store);
  const records: AppUsageRecord[] = [];
  const totals = new Map<string, number>();

  for (let h = from; h < to; h += HOUR) {
    const perProject = new Map<string, number>();
    for (const e of entries) {
      if (q.projectId && e.projectId !== q.projectId) continue;
      const s = Math.round((Math.min(e.stop, h + HOUR) - Math.max(e.start, h)) / 1000);
      if (s > 0) perProject.set(e.projectId, (perProject.get(e.projectId) ?? 0) + s);
    }
    if (perProject.size === 0) continue;
    const record: AppUsageRecord = { hour_bucket: fmtTz(h, tz, "YYYY-MM-DD HH:mm:ss") };
    for (const [projectId, seconds] of perProject) {
      const projectName = projectOf(projectId)?.name ?? projectId;
      const r = rng(`apps:${userId}:${h}:${projectId}`);
      // Pick 2-6 apps, weighted by the day's mix.
      const count = Math.min(apps.length, 2 + Math.floor(r() * 5));
      const pool = [...apps];
      const picked: { name: string; w: number }[] = [];
      while (picked.length < count && pool.length) {
        const total = pool.reduce((a, b) => a + b.w, 0);
        let x = r() * total;
        const i = pool.findIndex((p) => (x -= p.w) <= 0);
        picked.push(pool.splice(i < 0 ? 0 : i, 1)[0]);
      }
      const tracker = Math.min(seconds, 1 + (hashString(`${userId}:${h}`) % 40));
      const rest = seconds - tracker;
      const weights = picked.map((p) => p.w * (0.3 + r()));
      const wsum = weights.reduce((a, b) => a + b, 0) || 1;
      const list: AppUsageApplication[] = [];
      let used = 0;
      picked.forEach((p, i) => {
        const s = i === picked.length - 1 ? rest - used : Math.floor((rest * weights[i]) / wsum);
        used += s;
        if (s > 0) list.push({ application_name: p.name, usage_seconds: s, usage_seconds_interval: interval(s), project: projectName });
      });
      if (tracker > 0) list.push({ application_name: TRACKER_APP, usage_seconds: tracker, usage_seconds_interval: interval(tracker), project: projectName });
      list.sort((a, b) => b.usage_seconds - a.usage_seconds);
      for (const a of list) totals.set(a.application_name, (totals.get(a.application_name) ?? 0) + a.usage_seconds);
      record[projectName] = { total_usage_interval: interval(seconds), applications: list };
    }
    records.push(record);
  }

  const top = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([application_name, s]) => ({ application_name, total_usage_interval: interval(s) }));
  return { organization_timezone: ORGANIZATION.time_zone, records, top_5_applications: top };
}

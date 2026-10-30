/**
 * In-memory data store for the mock API.
 *
 * On first use (and after POST /api/__reset) it expands the definitions in seed.ts into
 *  1. one "day record" per member per day (aggregates used by the Dashboard endpoints), and
 *  2. the individual **time entries** behind every day (start/stop in UTC, project, task, activity,
 *     idle/manual flags) used by Timesheets, Screenshots, Apps and URLs.
 * Day records are always re-derived from the entries (see `syncDay`), so writes made through the
 * Timesheets / Screenshots endpoints show up everywhere, including the Dashboard.
 */
import dayjs from "dayjs";
import { APPS, MEMBERS, MOCK_SETTINGS, PROJECTS, type SeedMember } from "./seed";
import { clamp, fakeUuid, hashString, rng } from "./random";
import { dayjs as dayjsTz, localDate, localDayStartMs, localToUtcMs } from "./tz";

export { hashString, rng } from "./random";

export interface TaskEntry {
  projectId: string;
  task: string;
  seconds: number;
  activity: number;
}

export interface AppEntry {
  name: string;
  type: "app" | "url";
  seconds: number;
}

export interface DayRecord {
  date: string; // YYYY-MM-DD (member-local)
  userId: string;
  regularSeconds: number;
  ptoSeconds: number;
  /** Average activity (0-100) over regularSeconds. */
  activity: number;
  entries: TaskEntry[];
  apps: AppEntry[];
}

/** One tracked / manual time block (what the Timesheets page lists). */
export interface TimeEntry {
  /** local_activity_duration_id */
  id: string;
  clientLocalId: string;
  userId: string;
  projectId: string;
  /** Task name (task ids are derived: see taskIdOf in timeline.ts). null = no to-do. */
  task: string | null;
  /** Epoch ms (UTC). */
  start: number;
  stop: number;
  /** Activity percentage 0-100 (0 for manual time). */
  activity: number;
  isManual: boolean;
  isOriginManual: boolean | null;
  isIdle: boolean;
  isPaid: boolean;
  isLocked: boolean;
  notes: string;
  /** "System Generated" for tracked time, otherwise the name of whoever added / edited it. */
  createdBy: string;
}

/** A screenshot that was deleted together with its 10-minute slot (Activity › Deleted Screenshots). */
export interface DeletedScreenshot {
  id: number;
  /** All screenshots deleted in the same action share a group (restore works per group). */
  groupId: string;
  userId: string;
  projectId: string | null;
  task: string | null;
  slotStart: number;
  slotEnd: number;
  capturedAt: number;
  durationSeconds: number;
  url: string;
  deletedBy: string;
  deletedAt: number;
  reason: string;
  deletionType: "soft_deleted" | "permanently_deleted";
  isHipaa: boolean;
}

export interface SavedFilter {
  id: string;
  page_key: string;
  name: string;
  description: string;
  filters: Record<string, string | boolean>;
  position: number;
  created_at: string;
}

export interface MockStore {
  generatedAt: string;
  /** userId -> (date -> record) */
  records: Map<string, Map<string, DayRecord>>;
  /** userId -> time entries sorted by start */
  entries: Map<string, TimeEntry[]>;
  /** Removed time per deletion group (restored on "restore"). */
  removedFragments: Map<string, TimeEntry[]>;
  deletedScreenshots: DeletedScreenshot[];
  savedFilters: SavedFilter[];
}

/* ---------- generation ---------- */

/** How far through the working day we are (used to make "today" partial). */
function todayProgress(tz: string) {
  const now = dayjsTz().tz(tz);
  const hours = now.hour() + now.minute() / 60;
  return clamp((hours - 8) / 9, 0.18, 1);
}

function generateDay(member: SeedMember, date: dayjs.Dayjs, daysAgo: number): DayRecord | null {
  const r = rng(`${member.user_id}:${date.format("YYYY-MM-DD")}`);
  if (daysAgo < member.lastActiveDaysAgo) return null; // inactive lately

  const weekend = date.day() === 0 || date.day() === 6;
  let hours: number;
  if (weekend) {
    if (r() > 0.08) return null;
    hours = 0.8 + r() * 1.6;
  } else {
    if (r() < 0.04) return null; // occasional day off
    hours = member.hoursPerDay * (0.7 + r() * 0.6);
  }

  // Paid time off day (no tracked work, 8h PTO).
  if (!weekend && daysAgo > 0 && r() < MOCK_SETTINGS.ptoChance) {
    return { date: date.format("YYYY-MM-DD"), userId: member.user_id, regularSeconds: 0, ptoSeconds: 8 * 3600, activity: 0, entries: [], apps: [] };
  }

  if (daysAgo === 0) hours *= todayProgress(member.timezone);
  const regularSeconds = Math.round(hours * 3600);
  const activity = clamp(member.activity + (r() - 0.5) * 22, 3, 97);

  // Split the day across the member's projects and 1-2 tasks per project.
  const projects = PROJECTS.filter((p) => member.projects.includes(p.id));
  const shares = projects.map((p) => p.weight * (0.4 + r()));
  const totalShare = shares.reduce((a, b) => a + b, 0) || 1;
  const entries: TaskEntry[] = [];
  projects.forEach((p, i) => {
    const projectSeconds = Math.round((regularSeconds * shares[i]) / totalShare);
    if (projectSeconds < 300) return;
    const taskCount = r() < 0.45 ? 2 : 1;
    const first = Math.floor(r() * p.tasks.length);
    const split = taskCount === 2 ? 0.35 + r() * 0.3 : 1;
    entries.push({ projectId: p.id, task: p.tasks[first], seconds: Math.round(projectSeconds * split), activity: clamp(activity + (r() - 0.5) * 16, 2, 99) });
    if (taskCount === 2) {
      const second = (first + 1 + Math.floor(r() * (p.tasks.length - 1))) % p.tasks.length;
      entries.push({ projectId: p.id, task: p.tasks[second], seconds: Math.round(projectSeconds * (1 - split)), activity: clamp(activity + (r() - 0.5) * 16, 2, 99) });
    }
  });

  // Apps & URLs used that day: weighted random sample.
  const picked = APPS.filter((a) => r() < Math.min(0.95, 0.25 + a.weight / 25));
  const appWeights = picked.map((a) => a.weight * (0.5 + r()));
  const appTotal = appWeights.reduce((a, b) => a + b, 0) || 1;
  const apps: AppEntry[] = picked.map((a, i) => ({ name: a.name, type: a.type, seconds: Math.round((regularSeconds * appWeights[i]) / appTotal) }));

  return { date: date.format("YYYY-MM-DD"), userId: member.user_id, regularSeconds, ptoSeconds: 0, activity, entries, apps };
}

const MANUAL_NOTES = [
  "Client call — forgot to start the timer",
  "Sprint planning meeting (offline)",
  "Whiteboard session with the team",
  "Reviewed printed specs on the train",
  "Phone support escalation",
];

/**
 * Lays a day's task totals out as individual time entries in the member's own time zone:
 * starts 8:00–9:30, blocks of 10–45 min, short gaps, a lunch break, ~7% idle blocks and an
 * occasional manual entry. ""Today" ends at the current time.
 */
function generateEntries(member: SeedMember, rec: DayRecord, nowMs: number, todayLocal = localDate(nowMs, member.timezone)): TimeEntry[] {
  if (rec.regularSeconds <= 0 || rec.entries.length === 0) return [];
  const r = rng(`entries:${member.user_id}:${rec.date}`);
  const tz = member.timezone;
  const startOffsetMin = (hashString(member.user_id) % 90) + Math.floor(r() * 20);
  let cursor = localToUtcMs(rec.date, "08:00:00", tz) + startOffsetMin * 60_000 + Math.floor(r() * 59) * 1000;
  const lunchAt = cursor + rec.regularSeconds * 1000 * (0.45 + r() * 0.1);
  let lunchDone = rec.regularSeconds < 4 * 3600;
  const paid = dayjs().diff(dayjs(rec.date), "day") > 35;
  const manualDay = r() < 0.14;
  const out: TimeEntry[] = [];
  let n = 0;

  for (const te of rec.entries) {
    let remaining = te.seconds;
    while (remaining > 0) {
      let chunk = Math.min(remaining, Math.round((10 + r() * 35) * 60));
      if (remaining - chunk < 240) chunk = remaining;
      const idle = !manualDay && chunk >= 300 && r() < 0.07;
      const manual = manualDay && out.length > 2 && !out.some((e) => e.isManual) && chunk >= 900;
      const key = `${member.user_id}:${rec.date}:${n++}`;
      out.push({
        id: fakeUuid(`lad:${key}`),
        clientLocalId: fakeUuid(`cli:${key}`),
        userId: member.user_id,
        projectId: te.projectId,
        task: r() < 0.12 ? null : te.task,
        start: cursor,
        stop: cursor + chunk * 1000,
        activity: manual ? 0 : idle ? Math.round(r() * 4) : Math.round(clamp(te.activity + (r() - 0.5) * 24, 1, 99)),
        isManual: manual,
        isOriginManual: null,
        isIdle: idle,
        isPaid: paid,
        isLocked: false,
        notes: manual ? MANUAL_NOTES[Math.floor(r() * MANUAL_NOTES.length)] : "",
        createdBy: manual ? member.full_name : "System Generated",
      });
      cursor += chunk * 1000;
      if (r() < 0.35) cursor += Math.floor(r() * 6 * 60) * 1000;
      if (!lunchDone && cursor > lunchAt) {
        cursor += Math.floor((30 + r() * 30) * 60) * 1000;
        lunchDone = true;
      }
      remaining -= chunk;
    }
  }
  // Today: the member is "currently working" — shift the day so it ends ~2 minutes ago
  // (keeps Recent Screenshots populated at any hour), and drop anything before local midnight.
  if (rec.date === todayLocal && out.length) {
    const shift = nowMs - 120_000 - out[out.length - 1].stop;
    const dayStart = localDayStartMs(rec.date, tz);
    return out
      .map((e) => ({ ...e, start: e.start + shift - (shift % 1000), stop: e.stop + shift - (shift % 1000) }))
      .filter((e) => e.stop > dayStart)
      .map((e) => (e.start < dayStart ? { ...e, start: dayStart } : e));
  }
  return out;
}

/* ---------- day records derived from entries ---------- */

export function memberOf(userId: string) {
  return MEMBERS.find((m) => m.user_id === userId);
}

/**
 * Recomputes the Dashboard aggregates (regular time, activity, project/task totals, app usage)
 * of one member-local day from its time entries.
 */
export function syncDay(store: MockStore, userId: string, date: string, dayEntries?: TimeEntry[]) {
  const member = memberOf(userId);
  if (!member) return;
  let list = dayEntries;
  if (!list) {
    const from = localDayStartMs(date, member.timezone);
    const to = from + 26 * 3600_000;
    list = (store.entries.get(userId) ?? []).filter((e) => e.start >= from - 2 * 3600_000 && e.start < to && localDate(e.start, member.timezone) === date);
  }
  const byDate = store.records.get(userId) ?? new Map<string, DayRecord>();
  store.records.set(userId, byDate);
  const existing = byDate.get(date);
  const seconds = list.reduce((s, e) => s + Math.round((e.stop - e.start) / 1000), 0);
  if (!existing && seconds === 0) return;

  const rec: DayRecord = existing ?? { date, userId, regularSeconds: 0, ptoSeconds: 0, activity: 0, entries: [], apps: [] };
  const oldSeconds = rec.regularSeconds;
  const tasks = new Map<string, TaskEntry & { weighted: number }>();
  let weighted = 0;
  for (const e of list) {
    const s = Math.round((e.stop - e.start) / 1000);
    weighted += s * e.activity;
    const task = e.task ?? "No to-do";
    const key = `${e.projectId}|${task}`;
    const t = tasks.get(key) ?? { projectId: e.projectId, task, seconds: 0, activity: 0, weighted: 0 };
    t.seconds += s;
    t.weighted += s * e.activity;
    tasks.set(key, t);
  }
  rec.regularSeconds = seconds;
  rec.activity = seconds ? weighted / seconds : 0;
  rec.entries = [...tasks.values()].map(({ weighted: w, ...t }) => ({ ...t, activity: t.seconds ? w / t.seconds : 0 }));
  if (oldSeconds > 0) {
    const f = seconds / oldSeconds;
    rec.apps = rec.apps.map((a) => ({ ...a, seconds: Math.round(a.seconds * f) }));
  } else if (seconds > 0 && rec.apps.length === 0) {
    rec.apps = APPS.slice(0, 6).map((a, i) => ({ name: a.name, type: a.type, seconds: Math.round((seconds * (6 - i)) / 21) }));
  }
  byDate.set(date, rec);
}

function buildStore(): MockStore {
  const records = new Map<string, Map<string, DayRecord>>();
  const entries = new Map<string, TimeEntry[]>();
  const now = Date.now();
  const store: MockStore = { generatedAt: new Date().toISOString(), records, entries, removedFragments: new Map(), deletedScreenshots: [], savedFilters: [] };
  for (const member of MEMBERS) {
    const byDate = new Map<string, DayRecord>();
    const list: TimeEntry[] = [];
    const perDay: [string, TimeEntry[]][] = [];
    // Every member's calendar is their own local one ("today" = today in their time zone).
    const todayLocalStr = localDate(now, member.timezone);
    const today = dayjs(todayLocalStr);
    for (let d = MOCK_SETTINGS.historyDays; d >= 0; d--) {
      const date = today.subtract(d, "day");
      const rec = generateDay(member, date, d);
      if (!rec) continue;
      byDate.set(rec.date, rec);
      const dayEntries = generateEntries(member, rec, now, todayLocalStr);
      list.push(...dayEntries);
      perDay.push([rec.date, dayEntries]);
    }
    records.set(member.user_id, byDate);
    entries.set(member.user_id, list.sort((a, b) => a.start - b.start));
    // Re-derive the aggregates so Dashboard and Timesheets agree to the second.
    for (const [date, dayEntries] of perDay) if (byDate.get(date)!.regularSeconds > 0) syncDay(store, member.user_id, date, dayEntries);
  }
  for (const hook of buildHooks) hook(store);
  return store;
}

/**
 * Extra seeding steps (e.g. pre-deleted screenshots) registered by other mock modules.
 * They run at the end of every (re)build.
 */
const buildHooks: ((store: MockStore) => void)[] = [];
export function onStoreBuild(hook: (store: MockStore) => void) {
  if (buildHooks.includes(hook)) return;
  buildHooks.push(hook);
  // Registered after the store was built (module loaded late): apply to the current store too.
  if (g.__twMockStore) hook(g.__twMockStore);
}

// Keep a single instance across hot reloads in dev.
const g = globalThis as unknown as { __twMockStore?: MockStore };

export function getStore(): MockStore {
  const today = dayjs().format("YYYY-MM-DD");
  // Rebuild automatically when the day rolls over (or on first use).
  if (!g.__twMockStore || dayjs(g.__twMockStore.generatedAt).format("YYYY-MM-DD") !== today) {
    g.__twMockStore = buildStore();
  }
  return g.__twMockStore;
}

export function resetStore(): MockStore {
  g.__twMockStore = buildStore();
  return g.__twMockStore;
}

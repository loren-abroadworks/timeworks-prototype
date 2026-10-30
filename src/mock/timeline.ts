/**
 * Time-entry API over the mock store: queries by member-local day / time zone, writes
 * (add / edit / split / delete / range removal for screenshot-slot deletion) and the per-10-minute
 * "slot" view that Screenshots, Apps and URLs are built from.
 *
 * Every write re-syncs the affected day records, so Dashboard totals follow automatically.
 */
import { MEMBERS, PROJECTS, SCREENSHOT_IMAGES } from "./seed";
import { clamp, hashString, rng, runtimeId } from "./random";
import { getStore, memberOf, syncDay, type MockStore, type TimeEntry } from "./store";
import { localDate, localDayStartMs } from "./tz";

export type { TimeEntry } from "./store";

export const SLOT_MS = 10 * 60_000;

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export const projectOf = (id: string | null | undefined) => PROJECTS.find((p) => p.id === id);

/** Stable task ids: "<projectId>-t<index>" (index into PROJECTS[].tasks). */
export function taskIdOf(projectId: string, task: string | null) {
  if (!task) return null;
  const p = projectOf(projectId);
  const i = p ? p.tasks.indexOf(task) : -1;
  return i >= 0 ? `${projectId}-t${i}` : null;
}

export function taskNameOf(projectId: string, taskId: string | null | undefined) {
  if (!taskId) return null;
  const m = /-t(\d+)$/.exec(taskId);
  const p = projectOf(projectId);
  return m && p ? (p.tasks[Number(m[1])] ?? null) : null;
}

export function entriesOf(userId: string, store: MockStore = getStore()) {
  return store.entries.get(userId) ?? [];
}

export function findEntry(id: string, store: MockStore = getStore()): TimeEntry | undefined {
  for (const list of store.entries.values()) {
    const e = list.find((x) => x.id === id || x.clientLocalId === id);
    if (e) return e;
  }
  return undefined;
}

/** Entries overlapping [from, to) (epoch ms). */
export function entriesBetween(userId: string, from: number, to: number, store: MockStore = getStore()) {
  return entriesOf(userId, store).filter((e) => e.stop > from && e.start < to);
}

/**
 * Entries whose START falls on the given local dates in `tz` (inclusive range), grouped by date.
 * This is how the live timesheet buckets entries per day.
 */
export function entriesByLocalDate(userId: string, startDate: string, endDate: string, tz: string, store: MockStore = getStore()) {
  const from = localDayStartMs(startDate, tz);
  const to = localDayStartMs(endDate, tz) + 26 * 3600_000;
  const out = new Map<string, TimeEntry[]>();
  for (const e of entriesOf(userId, store)) {
    if (e.start < from - 3600_000 || e.start >= to) continue;
    const d = localDate(e.start, tz);
    if (d < startDate || d > endDate) continue;
    if (!out.has(d)) out.set(d, []);
    out.get(d)!.push(e);
  }
  return out;
}

export function overlapping(userId: string, start: number, stop: number, excludeIds: string[] = [], store: MockStore = getStore()) {
  return entriesOf(userId, store).filter((e) => !excludeIds.includes(e.id) && e.start < stop && e.stop > start);
}

export const durationSeconds = (e: { start: number; stop: number }) => Math.round((e.stop - e.start) / 1000);

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

function sortAndSync(store: MockStore, userId: string, touched: number[]) {
  const list = store.entries.get(userId) ?? [];
  list.sort((a, b) => a.start - b.start);
  store.entries.set(userId, list);
  const member = memberOf(userId);
  if (!member) return;
  const dates = new Set(touched.map((ms) => localDate(ms, member.timezone)));
  for (const d of dates) syncDay(store, userId, d);
}

export interface NewEntryInput {
  userId: string;
  projectId: string;
  task: string | null;
  start: number;
  stop: number;
  notes?: string;
  isManual?: boolean;
  isIdle?: boolean;
  activity?: number;
  createdBy?: string;
}

export function addEntry(input: NewEntryInput, store: MockStore = getStore()): TimeEntry {
  const entry: TimeEntry = {
    id: runtimeId("lad"),
    clientLocalId: runtimeId("cli"),
    userId: input.userId,
    projectId: input.projectId,
    task: input.task,
    start: input.start,
    stop: input.stop,
    activity: input.activity ?? 0,
    isManual: input.isManual ?? true,
    isOriginManual: input.isManual ?? true ? true : null,
    isIdle: input.isIdle ?? false,
    isPaid: false,
    isLocked: false,
    notes: input.notes ?? "",
    createdBy: input.createdBy ?? MEMBERS[0].full_name,
  };
  const list = store.entries.get(input.userId) ?? [];
  list.push(entry);
  store.entries.set(input.userId, list);
  sortAndSync(store, input.userId, [entry.start]);
  return entry;
}

export function updateEntry(id: string, patch: Partial<Omit<TimeEntry, "id" | "userId">>, store: MockStore = getStore()): TimeEntry | undefined {
  const e = findEntry(id, store);
  if (!e) return undefined;
  const before = e.start;
  Object.assign(e, patch);
  sortAndSync(store, e.userId, [before, e.start]);
  return e;
}

export function deleteEntry(id: string, store: MockStore = getStore()): TimeEntry | undefined {
  const e = findEntry(id, store);
  if (!e) return undefined;
  const list = store.entries.get(e.userId)!;
  list.splice(list.indexOf(e), 1);
  sortAndSync(store, e.userId, [e.start]);
  return e;
}

/** Replaces one entry by several (split). The first part keeps the original ids. */
export function replaceEntry(id: string, parts: Omit<NewEntryInput, "userId">[], store: MockStore = getStore()): TimeEntry[] {
  const e = findEntry(id, store);
  if (!e) return [];
  const list = store.entries.get(e.userId)!;
  list.splice(list.indexOf(e), 1);
  const created = parts.map((p, i) => {
    const entry: TimeEntry = {
      ...e,
      id: i === 0 ? e.id : runtimeId("lad"),
      clientLocalId: i === 0 ? e.clientLocalId : runtimeId("cli"),
      projectId: p.projectId,
      task: p.task,
      start: p.start,
      stop: p.stop,
      notes: p.notes ?? e.notes,
      createdBy: p.createdBy ?? e.createdBy,
    };
    list.push(entry);
    return entry;
  });
  sortAndSync(store, e.userId, [e.start, ...created.map((c) => c.start)]);
  return created;
}

/**
 * Cuts [from, to) out of a member's time (entries are trimmed / split at the edges).
 * Returns the removed fragments so they can be restored later.
 */
export function removeRange(userId: string, from: number, to: number, store: MockStore = getStore()): TimeEntry[] {
  const list = store.entries.get(userId) ?? [];
  const removed: TimeEntry[] = [];
  const keep: TimeEntry[] = [];
  for (const e of list) {
    if (e.stop <= from || e.start >= to) {
      keep.push(e);
      continue;
    }
    removed.push({ ...e, start: Math.max(e.start, from), stop: Math.min(e.stop, to) });
    if (e.start < from) keep.push({ ...e, stop: from });
    if (e.stop > to) keep.push({ ...e, id: e.start < from ? runtimeId("lad") : e.id, clientLocalId: e.start < from ? runtimeId("cli") : e.clientLocalId, start: to });
  }
  store.entries.set(userId, keep);
  sortAndSync(store, userId, [from]);
  return removed;
}

/** Puts previously removed fragments back (merging is not needed — they never overlap the cut). */
export function restoreFragments(userId: string, fragments: TimeEntry[], store: MockStore = getStore()) {
  const list = store.entries.get(userId) ?? [];
  for (const f of fragments) {
    if (overlapping(userId, f.start, f.stop, [], store).length) continue; // time was re-used meanwhile
    list.push({ ...f, id: list.some((x) => x.id === f.id) ? runtimeId("lad") : f.id });
  }
  store.entries.set(userId, list);
  sortAndSync(store, userId, fragments.map((f) => f.start));
}

/* ------------------------------------------------------------------ */
/* 10-minute slots (Screenshots / Apps / URLs are derived from these)  */
/* ------------------------------------------------------------------ */

export interface SlotShot {
  id: number;
  capturedAt: number;
  url: string;
}

export interface Slot {
  userId: string;
  start: number;
  end: number;
  /** Tracked seconds inside the slot. */
  seconds: number;
  activeSeconds: number;
  activity: number;
  keyPresses: number;
  mouseClicks: number;
  mouseMovements: number;
  /** The entry covering most of the slot. */
  main: TimeEntry;
  entries: TimeEntry[];
  isManual: boolean;
  isIdle: boolean;
  /** Screenshots captured in this slot (none for manual time). */
  shots: SlotShot[];
}

/** Deterministic screenshot id for (member, slot, n). */
export function screenshotId(userId: string, slotStart: number, n: number) {
  return (hashString(`shot:${userId}:${slotStart}:${n}`) % 90_000_000) + 10_000_000;
}

/** All 10-minute slots (aligned to the local clock of `tz`) with tracked time between from and to. */
export function slotsBetween(userId: string, from: number, to: number, store: MockStore = getStore()): Slot[] {
  const entries = entriesBetween(userId, from, to, store);
  const map = new Map<number, TimeEntry[]>();
  for (const e of entries) {
    let s = Math.floor(Math.max(e.start, from) / SLOT_MS) * SLOT_MS;
    for (; s < Math.min(e.stop, to); s += SLOT_MS) {
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(e);
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, list]) => buildSlot(userId, start, list));
}

function buildSlot(userId: string, start: number, list: TimeEntry[]): Slot {
  const end = start + SLOT_MS;
  let seconds = 0;
  let weighted = 0;
  let main = list[0];
  let mainSecs = -1;
  for (const e of list) {
    const s = Math.round((Math.min(e.stop, end) - Math.max(e.start, start)) / 1000);
    seconds += s;
    weighted += s * e.activity;
    if (s > mainSecs) {
      mainSecs = s;
      main = e;
    }
  }
  const activity = seconds ? Math.round(weighted / seconds) : 0;
  const r = rng(`slot:${userId}:${start}`);
  const activeSeconds = Math.round((seconds * activity) / 100);
  const isManual = list.every((e) => e.isManual);
  const isIdle = list.every((e) => e.isIdle);
  const shots: SlotShot[] = [];
  if (!isManual) {
    const count = seconds >= 420 ? 1 + (r() < 0.55 ? 1 : 0) + (r() < 0.15 ? 1 : 0) : seconds >= 90 ? 1 : 0;
    const trackedFrom = Math.max(start, Math.min(...list.map((e) => e.start)));
    const trackedTo = Math.min(end, Math.max(...list.map((e) => e.stop)));
    for (let n = 0; n < count; n++) {
      const at = trackedFrom + Math.floor(((trackedTo - trackedFrom) * (n + 0.2 + r() * 0.6)) / count / 1000) * 1000;
      shots.push({ id: screenshotId(userId, start, n), capturedAt: clamp(at, trackedFrom, trackedTo - 1000), url: SCREENSHOT_IMAGES[hashString(`img:${userId}:${start}:${n}`) % SCREENSHOT_IMAGES.length] });
    }
  }
  const intensity = activity / 100;
  return {
    userId,
    start,
    end,
    seconds,
    activeSeconds,
    activity,
    keyPresses: isManual ? 0 : Math.round(seconds * intensity * (0.6 + r() * 1.4)),
    mouseClicks: isManual ? 0 : Math.round(seconds * intensity * (0.05 + r() * 0.15)),
    mouseMovements: isManual ? 0 : Math.round(seconds * intensity * (0.8 + r() * 1.6)),
    main,
    entries: list,
    isManual,
    isIdle,
    shots,
  };
}

/** Slots of one local day in `tz`. */
export function slotsOfLocalDay(userId: string, date: string, tz: string, store: MockStore = getStore()) {
  const from = localDayStartMs(date, tz);
  const to = localDayStartMs(dayAfter(date), tz);
  return slotsBetween(userId, from, to, store);
}

export function dayAfter(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function dayBefore(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

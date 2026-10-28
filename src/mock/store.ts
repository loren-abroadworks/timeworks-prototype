/**
 * In-memory data store for the mock API.
 *
 * On first use (and after POST /api/__reset) it expands the definitions in seed.ts into
 * one "day record" per member per day. All dashboard endpoints aggregate these records,
 * so changing the date range changes the numbers.
 */
import dayjs from "dayjs";
import { APPS, MEMBERS, MOCK_SETTINGS, PROJECTS, type SeedMember } from "./seed";

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
  date: string; // YYYY-MM-DD
  userId: string;
  regularSeconds: number;
  ptoSeconds: number;
  /** Average activity (0-100) over regularSeconds. */
  activity: number;
  entries: TaskEntry[];
  apps: AppEntry[];
}

export interface MockStore {
  generatedAt: string;
  /** userId -> (date -> record) */
  records: Map<string, Map<string, DayRecord>>;
}

/* ---------- deterministic random helpers ---------- */

export function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small seeded PRNG (mulberry32). Same seed => same sequence. */
export function rng(seedText: string) {
  let a = hashString(`${MOCK_SETTINGS.seed}:${seedText}`);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** How far through the working day we are (used to make "today" partial). */
function todayProgress() {
  const now = dayjs();
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

  if (daysAgo === 0) hours *= todayProgress();
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

function buildStore(): MockStore {
  const records = new Map<string, Map<string, DayRecord>>();
  const today = dayjs().startOf("day");
  for (const member of MEMBERS) {
    const byDate = new Map<string, DayRecord>();
    for (let d = 0; d <= MOCK_SETTINGS.historyDays; d++) {
      const date = today.subtract(d, "day");
      const rec = generateDay(member, date, d);
      if (rec) byDate.set(rec.date, rec);
    }
    records.set(member.user_id, byDate);
  }
  return { generatedAt: new Date().toISOString(), records };
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

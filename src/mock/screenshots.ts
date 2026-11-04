/**
 * Activity › Screenshots and Activity › Deleted Screenshots mock logic.
 *
 * Screenshots are derived from the time entries (timeline.ts): every 10-minute slot with tracked
 * time gets 1–3 deterministic fake screenshots, input counts, and occasionally fraud / context flags.
 * Deleting a slot cuts that time out of the member's entries (Timesheets + Dashboard totals drop)
 * and turns its screenshots into soft-deleted audit records; restoring puts the time back.
 */
import type {
  ActivityHourlyBucket,
  ActivityHourlySlot,
  ActivityScreenshotsResponse,
  ActivityShot,
  ActivityTenMinuteSlot,
  DeletedScreenshotRecord,
  DeletedScreenshotsResponse,
  FraudFlag,
} from "@/lib/types/screenshots";
import { DEMO_USER_ID, MEMBERS, MOCK_SETTINGS, PROJECTS } from "./seed";
import type { Ctx } from "./engine";
import { ApiError } from "./http";
import { fakeUuid, hashString, rng, runtimeId } from "./random";
import { leaveOn } from "./timeoff";
import { getStore, memberOf, onStoreBuild, type DeletedScreenshot, type MockStore } from "./store";
import { projectOf, removeRange, restoreFragments, slotsBetween, slotsOfLocalDay, SLOT_MS, type Slot } from "./timeline";
import { dayjs, fmtTz, localDate, localDayStartMs, safeTz, utcIso } from "./tz";

const RETENTION_DAYS = 90;
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

function intlName(tz: string, at: number, style: "short" | "long") {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: style }).formatToParts(new Date(at)).find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/** "EDT" for New York, "PST" (Philippine Standard Time) for Manila — same rule as the live app. */
export function zoneAbbr(tz: string, at = Date.now()) {
  const short = intlName(tz, at, "short");
  if (short && !/^GMT|^UTC[+-]/.test(short)) return short;
  return (intlName(tz, at, "long").match(/\b[A-Z]/g) ?? []).join("") || short;
}

/** "2026-10-28 12:05:33 AM EDT" (the live lightbox caption is this value verbatim). */
export function userTzStamp(ms: number, tz: string) {
  return `${fmtTz(ms, tz, "YYYY-MM-DD hh:mm:ss A")} ${zoneAbbr(tz, ms)}`;
}

/** Slot ids exposed as `local_activity_duration_ids` — "slot-<epoch ms of the slot start>". */
export const slotToken = (start: number) => `slot-${start}`;
export function parseSlotToken(token: string) {
  const m = /^slot-(\d+)$/.exec(token.trim());
  return m ? Number(m[1]) : null;
}

function shotPath(userId: string, at: number, n: number) {
  return `screenshots/${MOCK_SETTINGS.seed % 1000}/${userId}/${n + 1}_screenshot_${dayjs(at).utc().format("YYYYMMDD_HHmmss")}.svg`;
}

/* ------------------------------------------------------------------ */
/* Fraud / context flags (sparse, deterministic, fictional)            */
/* ------------------------------------------------------------------ */

function evidenceFor(kind: string, r: () => number): Record<string, unknown> {
  switch (kind) {
    case "context_meeting":
      return {
        room_hash: null,
        mic_active: r() < 0.6,
        sub_signals: ["process_detected"],
        camera_active: r() < 0.3,
        in_foreground: true,
        participation: { speaking_secs: Math.round(r() * 240), listening_secs: Math.round(200 + r() * 300) },
        concurrent_work: { typing_secs: Math.round(r() * 60), app_switches: Math.round(r() * 6) },
        process_detected: true,
      };
    case "context_consumption":
      return { sub_signals: ["scroll_heavy"], wheel_count: Math.round(10 + r() * 60), reading_secs: Math.round(r() * 90), media_process: false, scroll_buckets: Math.round(1 + r() * 5), document_viewer: r() < 0.3 };
    case "context_passive_work":
      return { sub_signals: ["low_input"], idle_gaps: Math.round(1 + r() * 4), longest_gap_secs: Math.round(60 + r() * 200), foreground_app: "Notion" };
    case "hw_jiggler_device":
      return { device_name: "USB Composite Device", vendor_id: "0x1a2c", product_id: "0x0b2a", movement_pattern: "periodic", period_ms: 30000 };
    case "synthetic_input":
      return { sub_signals: ["uniform_intervals"], injected_events: Math.round(20 + r() * 80), source_process: "autoclicker.exe" };
    default:
      return {};
  }
}

/** ~10% of slots carry a context flag, ~1.5% a fraud flag. */
function flagsFor(userId: string, slot: Slot): FraudFlag[] {
  if (slot.isManual) return [];
  const r = rng(`flags:${userId}:${slot.start}`);
  const roll = r();
  let kinds: string[] = [];
  if (roll < 0.06) kinds = ["context_meeting"];
  else if (roll < 0.085) kinds = ["context_consumption", "context_meeting"];
  else if (roll < 0.1) kinds = ["context_passive_work"];
  else if (roll < 0.108) kinds = ["hw_jiggler_device"];
  else if (roll < 0.115) kinds = ["synthetic_input"];
  return kinds.map((kind, i) => {
    const detected = slot.end;
    return {
      id: fakeUuid(`flag:${userId}:${slot.start}:${i}`),
      session_id: null,
      slot_id: fakeUuid(`slot:${userId}:${slot.start}`),
      time_entry_id: null,
      kind,
      evidence: evidenceFor(kind, r),
      os_source: hashString(userId) % 5 === 0 ? "macos" : "windows",
      policy_action: kind.startsWith("context_") ? "flag" : "alert",
      detected_at: utcIso(detected),
      created_at: utcIso(detected + Math.round(20 + r() * 40) * 1000),
    };
  });
}

/* ------------------------------------------------------------------ */
/* GET /activity-screenshots/{org}                                     */
/* ------------------------------------------------------------------ */

function shotsOf(slot: Slot, tz: string): ActivityShot[] {
  const project = projectOf(slot.main.projectId)?.name ?? null;
  return slot.shots.map((s, n) => ({
    id: s.id,
    captured_at: utcIso(s.capturedAt),
    captured_at_user_tz: userTzStamp(s.capturedAt, tz),
    url: s.url,
    path: shotPath(slot.userId, s.capturedAt, n),
    is_hipaa_compliant: false,
    is_manual: false,
    project,
    task: slot.main.task,
  }));
}

function emptyTen(start: number, tz: string): ActivityTenMinuteSlot {
  return {
    time_slot: fmtTz(start, tz, "HH:mm"),
    slot_start_utc: utcIso(start),
    slot_end_utc: utcIso(start + SLOT_MS),
    slot_start_user_tz: userTzStamp(start, tz),
    slot_end_user_tz: userTzStamp(start + SLOT_MS, tz),
    total_duration_seconds: 0,
    total_duration_minutes: 0,
    active_seconds: 0,
    active_minutes: 0,
    mouse_clicks: 0,
    mouse_movements: 0,
    key_presses: 0,
    activity_percentage: 0,
    screenshots: [],
    local_activity_duration_ids: "",
    is_manual: false,
    is_deleted: false,
    project: null,
    task: null,
    fraud_flags: [],
  };
}

function tenOf(slot: Slot, tz: string): ActivityTenMinuteSlot {
  return {
    ...emptyTen(slot.start, tz),
    total_duration_seconds: slot.seconds,
    total_duration_minutes: round2(slot.seconds / 60),
    active_seconds: slot.activeSeconds,
    active_minutes: round2(slot.activeSeconds / 60),
    mouse_clicks: slot.mouseClicks,
    mouse_movements: slot.mouseMovements,
    key_presses: slot.keyPresses,
    activity_percentage: slot.activity,
    screenshots: shotsOf(slot, tz),
    local_activity_duration_ids: slotToken(slot.start),
    is_manual: slot.isManual,
    project: projectOf(slot.main.projectId)?.name ?? null,
    task: slot.main.task,
    fraud_flags: flagsFor(slot.userId, slot),
  };
}

/** Deleted (soft) slots of the day, shown with is_deleted=true (Time Type › Deleted filter). */
function deletedTens(store: MockStore, userId: string, from: number, to: number, tz: string): Map<number, ActivityTenMinuteSlot> {
  const groups = new Map<number, DeletedScreenshot[]>();
  for (const d of store.deletedScreenshots) {
    if (d.userId !== userId || d.deletionType !== "soft_deleted" || d.slotStart < from || d.slotStart >= to) continue;
    if (!groups.has(d.slotStart)) groups.set(d.slotStart, []);
    groups.get(d.slotStart)!.push(d);
  }
  const out = new Map<number, ActivityTenMinuteSlot>();
  for (const [start, list] of groups) {
    const project = projectOf(list[0].projectId)?.name ?? null;
    out.set(start, {
      ...emptyTen(start, tz),
      total_duration_seconds: list[0].durationSeconds,
      total_duration_minutes: round2(list[0].durationSeconds / 60),
      screenshots: list.map((d, n) => ({
        id: d.id,
        captured_at: utcIso(d.capturedAt),
        captured_at_user_tz: userTzStamp(d.capturedAt, tz),
        url: d.url,
        path: shotPath(userId, d.capturedAt, n),
        is_hipaa_compliant: d.isHipaa,
        is_manual: false,
        project,
        task: d.task,
      })),
      is_deleted: true,
      project,
      task: list[0].task,
    });
  }
  return out;
}

function hmsNoPad(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function activityScreenshots(ctx: Ctx, q: { date?: string | null; timezone?: string | null; viewMode?: string | null; userId?: string | null }): ActivityScreenshotsResponse {
  const tz = safeTz(q.timezone);
  const date = q.date || localDate(Date.now(), tz);
  const userId = q.userId && memberOf(q.userId) ? q.userId : DEMO_USER_ID;
  const viewMode = q.viewMode === "all_records" ? "all_records" : "every_ten_minutes";
  // Approved leave (Absence & Leave) on this day drives the "<Policy> · Full Day" banner.
  const leave = ctx.scenario === "empty" ? [] : leaveOn(userId, date);
  const base = { status: "success", is_work_screenshot_block_delete: false, date, has_time_off: leave.length > 0, time_off: leave as unknown[] };
  if (ctx.scenario === "empty") {
    return { ...base, total_hourly_slots: 0, total_work: "0:00:00", avg_activity_percentage: 0, ...(viewMode === "all_records" ? { hourly_buckets: [] } : { hourly_slots: [] }) };
  }

  const store = getStore();
  const from = localDayStartMs(date, tz);
  const to = localDayStartMs(dayjs(date).add(1, "day").format("YYYY-MM-DD"), tz);
  const slots = slotsOfLocalDay(userId, date, tz, store);
  const deleted = deletedTens(store, userId, from, to, tz);

  const totalSeconds = slots.reduce((s, x) => s + x.seconds, 0);
  const weighted = slots.reduce((s, x) => s + x.seconds * x.activity, 0);
  const summary = {
    ...base,
    total_hourly_slots: slots.length,
    total_work: hmsNoPad(totalSeconds),
    avg_activity_percentage: totalSeconds ? round2(weighted / totalSeconds) : 0,
  };

  // Group by local hour.
  const hourStart = (ms: number) => ms - (((ms - from) % 3_600_000) + 3_600_000) % 3_600_000;
  const hours = new Map<number, { slots: Slot[]; deleted: ActivityTenMinuteSlot[] }>();
  for (const s of slots) {
    const h = hourStart(s.start);
    if (!hours.has(h)) hours.set(h, { slots: [], deleted: [] });
    hours.get(h)!.slots.push(s);
  }
  for (const [start, d] of deleted) {
    if (slots.some((s) => s.start === start)) continue;
    const h = hourStart(start);
    if (!hours.has(h)) hours.set(h, { slots: [], deleted: [] });
    hours.get(h)!.deleted.push(d);
  }
  const ordered = [...hours.entries()].sort((a, b) => a[0] - b[0]);

  if (viewMode === "all_records") {
    const buckets: ActivityHourlyBucket[] = ordered
      .map(([h, g]) => ({
        hour_slot: fmtTz(h, tz, "HH:00"),
        slot_start_user_tz: userTzStamp(h, tz),
        screenshots: g.slots.flatMap((s) => shotsOf(s, tz)),
      }))
      .filter((b) => b.screenshots.length > 0);
    return { ...summary, hourly_buckets: buckets };
  }

  const hourly: ActivityHourlySlot[] = ordered.map(([h, g]) => {
    const tens: ActivityTenMinuteSlot[] = [];
    for (let i = 0; i < 6; i++) {
      const start = h + i * SLOT_MS;
      const live = g.slots.find((s) => s.start === start);
      const del = g.deleted.find((d) => d.slot_start_utc === utcIso(start));
      tens.push(live ? tenOf(live, tz) : del ?? emptyTen(start, tz));
    }
    const secs = g.slots.reduce((s, x) => s + x.seconds, 0);
    const active = g.slots.reduce((s, x) => s + x.activeSeconds, 0);
    return {
      hour_slot: fmtTz(h, tz, "HH:00"),
      slot_start_user_tz: userTzStamp(h, tz),
      total_duration_seconds: secs,
      total_duration_minutes: round2(secs / 60),
      active_seconds: active,
      active_minutes: round2(active / 60),
      mouse_clicks: g.slots.reduce((s, x) => s + x.mouseClicks, 0),
      mouse_movements: g.slots.reduce((s, x) => s + x.mouseMovements, 0),
      key_presses: g.slots.reduce((s, x) => s + x.keyPresses, 0),
      activity_percentage: secs ? round2(g.slots.reduce((s, x) => s + x.seconds * x.activity, 0) / secs) : 0,
      ten_minute_slots: tens,
    };
  });
  return { ...summary, hourly_slots: hourly };
}

/* ------------------------------------------------------------------ */
/* Slot deletion / restore                                             */
/* ------------------------------------------------------------------ */

/**
 * Deletes 10-minute slots: their time is cut out of the time entries and every screenshot becomes a
 * soft-deleted audit record (one restore group per slot). Returns the number of slots deleted.
 */
export function deleteSlots(userId: string, tokens: string[], reason: string, deletedBy: string, opts: { store?: MockStore; deletedAt?: number } = {}) {
  const store = opts.store ?? getStore();
  if (!memberOf(userId)) throw new ApiError(404, "User not found");
  const starts = [...new Set(tokens.map(parseSlotToken).filter((n): n is number => n !== null))];
  if (starts.length === 0) throw new ApiError(422, "local_activity_duration_id is required");
  let deletedSlots = 0;
  for (const start of starts) {
    const [slot] = slotsBetween(userId, start, start + SLOT_MS, store);
    if (!slot) continue;
    const groupId = runtimeId(`del:${userId}:${start}`);
    const fragments = removeRange(userId, start, start + SLOT_MS, store);
    store.removedFragments.set(groupId, fragments);
    const deletedAt = opts.deletedAt ?? Date.now();
    const text = reason.trim() || `Time slot deleted: ${utcIso(start)} to ${utcIso(start + SLOT_MS)} (UTC)`;
    for (const s of slot.shots) {
      store.deletedScreenshots.push({
        id: s.id,
        groupId,
        userId,
        projectId: slot.main.projectId,
        task: slot.main.task,
        slotStart: start,
        slotEnd: start + SLOT_MS,
        capturedAt: s.capturedAt,
        durationSeconds: slot.seconds,
        url: s.url,
        deletedBy,
        deletedAt,
        reason: text,
        deletionType: "soft_deleted",
        isHipaa: false,
      });
    }
    deletedSlots += 1;
  }
  return deletedSlots;
}

/** Restores a soft-deleted screenshot: its whole slot (time + screenshots) comes back. */
export function restoreScreenshot(id: number, store: MockStore = getStore()) {
  const rec = store.deletedScreenshots.find((d) => d.id === id && d.deletionType === "soft_deleted");
  if (!rec) throw new ApiError(404, "Deleted screenshot not found");
  const fragments = store.removedFragments.get(rec.groupId) ?? [];
  restoreFragments(rec.userId, fragments, store);
  store.removedFragments.delete(rec.groupId);
  const before = store.deletedScreenshots.length;
  store.deletedScreenshots = store.deletedScreenshots.filter((d) => !(d.groupId === rec.groupId && d.deletionType === "soft_deleted"));
  return before - store.deletedScreenshots.length;
}

/** Permanently deletes: the image is gone (screenshot_url null) and the time can no longer be restored. */
export function permanentlyDelete(id: number, store: MockStore = getStore()) {
  const rec = store.deletedScreenshots.find((d) => d.id === id);
  if (!rec) throw new ApiError(404, "Deleted screenshot not found");
  rec.deletionType = "permanently_deleted";
  rec.url = "";
  if (!store.deletedScreenshots.some((d) => d.groupId === rec.groupId && d.deletionType === "soft_deleted")) store.removedFragments.delete(rec.groupId);
  return 1;
}

export function idsFromBody(body: Record<string, unknown>): number[] {
  const raw = body.ids ?? body.screenshot_ids ?? body.deleted_screenshot_ids ?? [];
  return (Array.isArray(raw) ? raw : [raw]).map(Number).filter((n) => Number.isFinite(n));
}

/* ------------------------------------------------------------------ */
/* GET /audit/deleted-screenshots/{org}                                */
/* ------------------------------------------------------------------ */

export interface DeletedQuery {
  page?: number;
  pageSize?: number;
  memberId?: string | null;
  projectId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  deletionType?: string | null;
  timezone?: string | null;
}

function recordOf(d: DeletedScreenshot, tz: string, now: number): DeletedScreenshotRecord {
  const member = memberOf(d.userId);
  const expires = dayjs(d.deletedAt).add(RETENTION_DAYS, "day");
  const daysLeft = expires.diff(dayjs(now), "day");
  return {
    id: d.id,
    screenshot_url: d.url || null,
    thumbnail_url: null,
    member_name: member?.full_name ?? "Unknown",
    member_id: d.userId,
    project_name: projectOf(d.projectId)?.name ?? null,
    task_name: d.task,
    started_at: fmtTz(d.slotStart, tz),
    stopped_at: fmtTz(d.slotEnd, tz),
    captured_at: fmtTz(d.capturedAt, tz),
    duration_seconds: d.durationSeconds,
    deleted_by_name: d.deletedBy,
    deleted_at: fmtTz(d.deletedAt, tz),
    expiration_date: fmtTz(expires.valueOf(), tz, "YYYY-MM-DD"),
    is_expiring_soon: daysLeft <= 7,
    delete_reason: d.reason,
    deletion_type: d.deletionType,
    is_hipaa_compliance: d.isHipaa,
  };
}

export function filterDeleted(ctx: Ctx, q: DeletedQuery) {
  const tz = safeTz(q.timezone);
  if (ctx.scenario === "empty") return { tz, rows: [] as DeletedScreenshotRecord[] };
  const now = Date.now();
  const type = q.deletionType && q.deletionType !== "all" ? q.deletionType.replace("permanent_deleted", "permanently_deleted") : null;
  const rows = getStore()
    .deletedScreenshots.filter((d) => {
      if (q.memberId && d.userId !== q.memberId) return false;
      if (q.projectId && d.projectId !== q.projectId) return false;
      if (type && d.deletionType !== type) return false;
      const day = localDate(d.slotStart, tz);
      if (q.startDate && day < q.startDate) return false;
      if (q.endDate && day > q.endDate) return false;
      return now - d.deletedAt < RETENTION_DAYS * 86_400_000;
    })
    .sort((a, b) => b.deletedAt - a.deletedAt || b.slotStart - a.slotStart || a.capturedAt - b.capturedAt)
    .map((d) => recordOf(d, tz, now));
  return { tz, rows };
}

export function deletedScreenshots(ctx: Ctx, q: DeletedQuery): DeletedScreenshotsResponse {
  const page = Math.max(1, q.page || 1);
  const pageSize = Math.max(1, Math.min(200, q.pageSize || 10));
  const { tz, rows } = filterDeleted(ctx, q);
  return {
    records: rows.slice((page - 1) * pageSize, page * pageSize),
    total_count: rows.length,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(rows.length / pageSize),
    filters_applied: {
      member_id: q.memberId || null,
      member_search: null,
      project_id: q.projectId || null,
      task_id: null,
      start_date: q.startDate || null,
      end_date: q.endDate || null,
      deletion_type: q.deletionType || null,
      timezone: tz,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Bulk download (stub) + detail-view audit                            */
/* ------------------------------------------------------------------ */

interface DownloadTask {
  task_id: string;
  status: "preparing" | "ready" | "failed";
  created: number;
  member_id: string;
  start_date: string;
  end_date: string;
  screenshot_count: number;
  file_name: string;
}

const g = globalThis as unknown as { __twDownloads?: Map<string, DownloadTask>; __twViews?: { captured_at: string; timezone: string; user_id: string; viewed_at: string }[] };
const downloads = () => (g.__twDownloads ??= new Map());
export const screenshotViews = () => (g.__twViews ??= []);

export function startBulkDownload(body: Record<string, unknown>) {
  const memberId = String(body.member_id ?? body.user_id ?? DEMO_USER_ID);
  const tz = safeTz(String(body.timezone ?? ""));
  const start = String(body.start_date ?? localDate(Date.now(), tz));
  const end = String(body.end_date ?? start);
  if (!memberOf(memberId)) throw new ApiError(404, "User not found");
  const from = localDayStartMs(start, tz);
  const to = localDayStartMs(dayjs(end).add(1, "day").format("YYYY-MM-DD"), tz);
  const count = slotsBetween(memberId, from, to).reduce((s, x) => s + x.shots.length, 0);
  if (count === 0) return { status: "empty", task_id: null, screenshot_count: 0, message: "No screenshots found for the selected range" };
  const task: DownloadTask = {
    task_id: runtimeId("dl"),
    status: "preparing",
    created: Date.now(),
    member_id: memberId,
    start_date: start,
    end_date: end,
    screenshot_count: count,
    file_name: `screenshots_${(memberOf(memberId)?.full_name ?? "member").replace(/\s+/g, "_")}_${start}_to_${end}.zip`,
  };
  downloads().set(task.task_id, task);
  return { status: "started", task_id: task.task_id, screenshot_count: count };
}

/** Becomes "ready" ~1.5 s after it was started. The replica never builds a zip: download_url stays null. */
export function bulkDownloadStatus(taskId: string) {
  const t = downloads().get(taskId);
  if (!t) throw new ApiError(404, "Task not found");
  if (t.status === "preparing" && Date.now() - t.created > 1500) t.status = "ready";
  return { task_id: t.task_id, status: t.status, progress: t.status === "ready" ? 100 : 50, screenshot_count: t.screenshot_count, file_name: t.file_name, download_url: null };
}

export function trackView(q: { captured_at?: string | null; timezone?: string | null; user_id?: string | null }) {
  const row = { captured_at: q.captured_at ?? "", timezone: q.timezone ?? "", user_id: q.user_id ?? "", viewed_at: new Date().toISOString() };
  screenshotViews().push(row);
  return { status: "success", message: "Screenshot view tracked" };
}

/* ------------------------------------------------------------------ */
/* Seed: historical deleted screenshots                                */
/* ------------------------------------------------------------------ */

const REASONS = [
  "Personal browsing captured by mistake",
  "Screenshot shows confidential client data",
  "Duplicate time — logged manually instead",
  "Accidentally left the timer running during lunch",
  "Requested by member: private message visible",
  "",
];

/**
 * Pre-deletes a few slots per member over the last ~12 weeks so Deleted Screenshots is populated
 * (their time is removed from the entries, like a real deletion).
 */
export function seedDeletedScreenshots(store: MockStore) {
  if (store.deletedScreenshots.length) return;
  const managers = [MEMBERS[0].full_name, MEMBERS[1].full_name];
  const now = Date.now();
  for (const m of MEMBERS) {
    const r = rng(`deleted:${m.user_id}`);
    const picks = 3 + Math.floor(r() * 4);
    for (let i = 0; i < picks; i++) {
      const daysAgo = i === 0 ? 84 + Math.floor(r() * 4) : 2 + Math.floor(r() * 70);
      const date = dayjs(localDate(now, m.timezone)).subtract(daysAgo, "day").format("YYYY-MM-DD");
      const slots = slotsOfLocalDay(m.user_id, date, m.timezone, store).filter((s) => s.shots.length > 0 && s.seconds >= 300);
      if (!slots.length) continue;
      const slot = slots[Math.floor(r() * slots.length)];
      const deletedAt = Math.min(now - 3_600_000, slot.end + Math.floor((0.2 + r() * 3) * 86_400_000));
      const reason = REASONS[Math.floor(r() * REASONS.length)];
      const by = m.role === "Member" ? managers[Math.floor(r() * 2)] : r() < 0.5 ? m.full_name : managers[0];
      deleteSlots(m.user_id, [slotToken(slot.start)], reason, by, { store, deletedAt });
    }
  }
  // A couple of permanently deleted ones.
  const sorted = [...store.deletedScreenshots].sort((a, b) => a.deletedAt - b.deletedAt);
  for (const d of sorted.slice(3, 5)) {
    d.deletionType = "permanently_deleted";
    d.url = "";
  }
}

onStoreBuild(seedDeletedScreenshots);

export const projectsList = PROJECTS;

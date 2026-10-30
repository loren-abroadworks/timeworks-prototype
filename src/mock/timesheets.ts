/**
 * Timesheets › View & Edit — mock API logic.
 *
 * Read:  GET /reports/user-time-sheet/{org}/{user}?start_date&end_date&timezone_str&offset&limit[&project_id&time_type&activity_level][&export_type]
 * Write: add / edit / manual-edit / split / delete / manual-delete / block-delete / bulk-delete of time entries.
 *
 * All writes go through src/mock/timeline.ts, so they persist in the in-memory store and the day records
 * (Dashboard totals, Screenshots, Apps …) are recomputed. Times in requests are local wall-clock times in
 * `timezone_str` ("2026-10-28T12:03:31"), or ISO strings with an offset (bulk delete), exactly like the live app.
 */
import { DEMO_USER_ID, MANAGERS, MEMBERS, ORGANIZATION, PROJECTS, TEAMS } from "./seed";
import type { Ctx } from "./engine";
import { ApiError } from "./http";
import { getStore, memberOf, type TimeEntry } from "./store";
import {
  addEntry,
  deleteEntry,
  durationSeconds,
  entriesByLocalDate,
  findEntry,
  overlapping,
  projectOf,
  replaceEntry,
  taskIdOf,
  taskNameOf,
  updateEntry,
} from "./timeline";
import { dayjs, fmtTz, safeTz } from "./tz";
import type { TimesheetDay, TimesheetEntry, TimesheetTimeOff, TimesheetUser, UserTimesheetResponse } from "@/lib/types/timesheets";

/* ------------------------------------------------------------------ */
/* Formatting helpers (live formats)                                   */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");
const round2 = (n: number) => Math.round(n * 100) / 100;

/** 574 -> "0:09:34" (entry / day durations; zero -> "00:00:00"). */
export function hmsShort(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  if (s === 0) return "00:00:00";
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** 574 -> "00:09:34" (totals). */
export function hmsLong(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Python-style float percentage: 0 -> "0.0%", 12.27 -> "12.27%". */
function pyPercent(n: number) {
  const r = round2(n);
  return `${Number.isInteger(r) ? r.toFixed(1) : String(r)}%`;
}

/** Parses a request time: naive local ("2026-10-28T12:03:31") in `tz`, or ISO with offset / Z. */
export function parseRequestTime(text: unknown, tz: string): number {
  if (typeof text !== "string" || !text.trim()) return NaN;
  const t = text.trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(t)) return dayjs(t).valueOf();
  const d = dayjs.tz(t.replace(" ", "T"), safeTz(tz));
  return d.isValid() ? d.valueOf() : NaN;
}

const localIso = (ms: number, tz: string) => fmtTz(ms, tz, "YYYY-MM-DDTHH:mm:ss");

function datesDesc(start: string, end: string) {
  const out: string[] = [];
  let d = dayjs(end);
  const s = dayjs(start);
  for (let i = 0; i < 800 && !d.isBefore(s, "day"); i++) {
    out.push(d.format("YYYY-MM-DD"));
    d = d.subtract(1, "day");
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export interface TimesheetQuery {
  start: string;
  end: string;
  tz: string;
  offset: number;
  limit: number;
  projectId?: string | null;
  timeType?: string | null;
  activityLevel?: string | null;
}

function passes(e: TimeEntry, q: TimesheetQuery) {
  if (q.projectId && e.projectId !== q.projectId) return false;
  if (q.timeType) {
    const type = e.isIdle ? "idle" : e.isManual ? "manual" : "normal";
    if (type !== q.timeType) return false;
  }
  if (q.activityLevel) {
    const a = e.activity;
    if (q.activityLevel === "Low" && !(a <= 20)) return false;
    if (q.activityLevel === "Medium" && !(a > 20 && a < 60)) return false;
    if (q.activityLevel === "High" && !(a >= 60)) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* User block                                                          */
/* ------------------------------------------------------------------ */

const ROLE_NAMES: Record<string, string> = { Owner: "Organization Owner", Manager: "Organization Manager", Member: "Member" };
const CLIENTS = [...new Set(PROJECTS.map((p) => p.client).filter((c): c is string => !!c))];

export function timesheetUser(userId: string): TimesheetUser {
  const m = memberOf(userId) ?? memberOf(DEMO_USER_ID)!;
  const projects = PROJECTS.filter((p) => m.projects.includes(p.id));
  const clients = [...new Set(projects.map((p) => p.client).filter((c): c is string => !!c))];
  const managerIds = (MANAGERS[m.user_id] ?? [DEMO_USER_ID, "1b7e4c22-8d90-7a13-b5f2-6c0d9e3a1f44"]).filter((id) => id !== m.user_id);
  return {
    user_id: m.user_id,
    name: m.full_name,
    email: m.email,
    profile_picture: m.profile_image_url,
    role_name: ROLE_NAMES[m.role] ?? m.role,
    start_date: m.startDate,
    timezone: m.timezone,
    clients: clients.map((c) => ({ id: CLIENTS.indexOf(c) + 1, name: c })),
    projects: projects.map((p) => ({ id: p.id, name: p.name })),
    teams: TEAMS.filter((t) => m.teams.includes(t.id)).map((t) => ({ id: t.id, name: t.name })),
    managers: managerIds
      .map((id) => memberOf(id))
      .filter((x): x is NonNullable<typeof x> => !!x)
      .map((mgr) => ({
        user_id: mgr.user_id,
        name: mgr.full_name,
        projects: PROJECTS.filter((p) => mgr.projects.includes(p.id) && m.projects.includes(p.id)).map((p) => ({ id: p.id, name: p.name })),
        profile_picture: mgr.profile_image_url,
      })),
  };
}

/* ------------------------------------------------------------------ */
/* GET /reports/user-time-sheet                                        */
/* ------------------------------------------------------------------ */

export function toApiEntry(e: TimeEntry, tz: string): TimesheetEntry {
  const p = projectOf(e.projectId);
  const secs = durationSeconds(e);
  return {
    org_name: ORGANIZATION.organization_name,
    project_id: e.projectId,
    project_name: p?.name ?? "Unknown",
    client_name: p?.client ?? "",
    task_id: taskIdOf(e.projectId, e.task),
    task_name: e.task,
    duration_seconds: secs,
    duration: hmsShort(secs),
    activity_percentage: round2(e.activity),
    is_locked: e.isLocked,
    is_manual: e.isManual,
    is_origin_manual: e.isOriginManual,
    is_idle: e.isIdle,
    is_paid: e.isPaid,
    notes: e.notes,
    started_at: localIso(e.start, tz),
    stopped_at: localIso(e.stop, tz),
    is_running: false,
    created_by: e.createdBy,
    // Manual time has no tracked blocks behind it -> the UI uses the /manual-* endpoints.
    local_activity_duration_id: e.isManual ? "" : e.id,
    client_local_id: e.isManual ? "" : e.clientLocalId,
  };
}

function ptoFor(ctx: Ctx, userId: string, date: string): TimesheetTimeOff[] {
  if (ctx.scenario === "empty") return [];
  const rec = getStore().records.get(userId)?.get(date);
  if (!rec || rec.ptoSeconds <= 0) return [];
  return [
    {
      request_id: 9000 + (parseInt(date.replace(/-/g, ""), 10) % 1000),
      policy_id: 1,
      policy_name: "Paid Time Off",
      duration_state: "full_day",
      duration_seconds: rec.ptoSeconds,
      duration: hmsShort(rec.ptoSeconds),
      is_paid: true,
      started_at: `${date}T00:00:00`,
      stopped_at: `${date}T23:59:59`,
    },
  ];
}

export function userTimesheet(ctx: Ctx, userId: string, q: TimesheetQuery): UserTimesheetResponse {
  const tz = safeTz(q.tz);
  const dates = datesDesc(q.start, q.end);
  const byDate = ctx.scenario === "empty" ? new Map<string, TimeEntry[]>() : entriesByLocalDate(userId, q.start, q.end, tz);

  let regular = 0;
  let weighted = 0;
  let pto = 0;
  let ptoDays = 0;
  const days = new Map<string, TimesheetDay>();
  for (const date of dates) {
    const list = (byDate.get(date) ?? []).filter((e) => passes(e, q)).sort((a, b) => a.start - b.start);
    const secs = list.reduce((s, e) => s + durationSeconds(e), 0);
    const active = list.reduce((s, e) => s + (durationSeconds(e) * e.activity) / 100, 0);
    const timeOff = ptoFor(ctx, userId, date);
    const off = timeOff.reduce((s, t) => s + t.duration_seconds, 0);
    regular += secs;
    weighted += active;
    pto += off;
    if (off > 0) ptoDays += 1;
    days.set(date, {
      total_user_duration_seconds: secs,
      total_user_duration: hmsShort(secs),
      break_duration_second: 0,
      user_break_duration: "00:00:00",
      entries: list.map((e) => toApiEntry(e, tz)),
      time_off: timeOff,
      day_time_off_seconds: off,
      day_time_off_time: hmsLong(off),
      day_time_off_paid_seconds: off,
      day_time_off_paid_time: hmsLong(off),
      day_time_off_unpaid_seconds: 0,
      day_time_off_unpaid_time: "00:00:00",
      regular_day_total_second: secs,
      regular_day_total_time: hmsLong(secs),
      day_total_duration_second: secs + off,
      day_total_time: hmsLong(secs + off),
      average_activity: secs ? round2((active / secs) * 100) : 0,
      average_activity_seconds: Math.round(active),
    });
  }

  const page = dates.slice(q.offset, q.offset + q.limit);
  const report: Record<string, TimesheetDay> = {};
  for (const d of page) report[d] = days.get(d)!;

  return {
    user_id: userId,
    organization_id: ORGANIZATION.organization_id,
    user: timesheetUser(userId),
    user_total_spent: hmsLong(regular + pto),
    regular_total_spent: hmsLong(regular),
    pto_time_spend: hmsLong(pto),
    user_average_activity: pyPercent(regular ? (weighted / regular) * 100 : 0),
    report,
    time_off_summary: {
      total_seconds: pto,
      total_hours: hmsLong(pto),
      paid_seconds: pto,
      paid_hours: hmsLong(pto),
      unpaid_seconds: 0,
      unpaid_hours: "00:00:00",
      days_count: ptoDays,
      policies_count: pto > 0 ? 1 : 0,
    },
    limit: q.limit,
    offset: q.offset,
    total_dates: dates.length,
  };
}

/* ------------------------------------------------------------------ */
/* Export (export_type=excel|pdf) — generated locally                  */
/* ------------------------------------------------------------------ */

export function exportRows(ctx: Ctx, userId: string, q: TimesheetQuery) {
  const data = userTimesheet(ctx, userId, { ...q, offset: 0, limit: 10_000 });
  const rows: (string | number)[][] = [["Member", "Date", "Project", "To-Do", "Start", "Stop", "Duration", "Activity %", "Manual", "Idle", "Added/Edited By", "Notes"]];
  for (const date of Object.keys(data.report).sort()) {
    for (const e of data.report[date].entries) {
      rows.push([data.user.name, date, e.project_name, e.task_name ?? "", e.started_at, e.stopped_at, e.duration, e.activity_percentage, e.is_manual ? "Yes" : "No", e.is_idle ? "Yes" : "No", e.created_by, e.notes]);
    }
  }
  rows.push([]);
  rows.push(["Total Time Worked", data.regular_total_spent]);
  rows.push(["Total Time Off", data.pto_time_spend]);
  rows.push(["Total Time", data.user_total_spent]);
  rows.push(["Avg Activity", data.user_average_activity]);
  return { rows, data };
}

export function toCsvText(rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}

/** Minimal single-font PDF (Helvetica, A4 landscape, paginated) — enough for "Export as PDF". */
export function toPdf(title: string, lines: string[]) {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, "?");
  const perPage = 40;
  const pages: string[][] = [];
  for (let i = 0; i < Math.max(1, lines.length); i += perPage) pages.push(lines.slice(i, i + perPage));
  const objects: string[] = [];
  const pageIds: number[] = [];
  // 1 catalog, 2 pages, 3 font, then per page: page + content
  pages.forEach((pl, i) => {
    const pageId = 4 + i * 2;
    pageIds.push(pageId);
    const text = [`BT /F1 14 Tf 40 560 Td (${esc(i === 0 ? title : `${title} (cont.)`)}) Tj ET`, ...pl.map((l, j) => `BT /F1 8 Tf 40 ${535 - j * 13} Td (${esc(l)}) Tj ET`)].join("\n");
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] = `<< /Length ${text.length} >>\nstream\n${text}\nendstream`;
  });
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((p) => `${p} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = out.length;
    out += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return out;
}

/* ------------------------------------------------------------------ */
/* Project tasks (To-Do select)                                        */
/* ------------------------------------------------------------------ */

export function projectTasks(projectId: string) {
  const p = projectOf(projectId);
  return { items: (p?.tasks ?? []).map((name, i) => ({ id: `${p!.id}-t${i}`, name })) };
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

const ACTOR = () => MEMBERS.find((m) => m.user_id === DEMO_USER_ID)!.full_name;

function requireUser(userId: string) {
  if (!memberOf(userId)) throw new ApiError(404, "User not found");
}

interface EntryInput {
  started_at_utc?: unknown;
  stopped_at_utc?: unknown;
  project_id?: unknown;
  task_id?: unknown;
  notes?: unknown;
}

function parseInput(body: EntryInput, tz: string, opts: { notesRequired?: boolean } = {}) {
  const start = parseRequestTime(body.started_at_utc, tz);
  const stop = parseRequestTime(body.stopped_at_utc, tz);
  const projectId = typeof body.project_id === "string" ? body.project_id : "";
  if (!projectId) throw new ApiError(422, "Project is required");
  if (!projectOf(projectId)) throw new ApiError(422, "Project not found");
  if (!Number.isFinite(start) || !Number.isFinite(stop)) throw new ApiError(422, "Start and end time are required");
  if (stop <= start) throw new ApiError(422, "End time must be after start time");
  if (stop > Date.now() + 60_000) throw new ApiError(422, "Time entries cannot be in the future");
  const taskId = typeof body.task_id === "string" && body.task_id ? body.task_id : null;
  const task = taskNameOf(projectId, taskId);
  if (taskId && !task) throw new ApiError(422, "To-Do does not belong to the selected project");
  const notes = typeof body.notes === "string" ? body.notes : "";
  if (opts.notesRequired && !notes.trim()) throw new ApiError(422, "Notes are required");
  return { start, stop, projectId, task, notes };
}

function assertNoOverlap(userId: string, start: number, stop: number, exclude: string[]) {
  const clash = overlapping(userId, start, stop, exclude);
  if (clash.length) throw new ApiError(409, "This time overlaps with an existing time entry");
}

const ok = (message: string, extra: Record<string, unknown> = {}) => ({ status: "success", message, ...extra });

/** POST /add/time-entries[-slot]/{org}/{user}?timezone_str= — body {started_at_utc, stopped_at_utc, project_id, task_id, notes} */
export function addTimeEntry(userId: string, tz: string, body: EntryInput) {
  requireUser(userId);
  const p = parseInput(body, safeTz(tz));
  assertNoOverlap(userId, p.start, p.stop, []);
  const e = addEntry({ userId, projectId: p.projectId, task: p.task, start: p.start, stop: p.stop, notes: p.notes, isManual: true, createdBy: ACTOR() });
  return ok("Time entry added successfully", { data: toApiEntry(e, safeTz(tz)) });
}

/** Find the entry a non-slot request refers to by its (old) local start / stop. */
function entryByTimes(userId: string, startText: unknown, stopText: unknown, tz: string) {
  const s = parseRequestTime(startText, tz);
  const t = parseRequestTime(stopText, tz);
  if (!Number.isFinite(s)) throw new ApiError(422, "Original start time is required");
  const e = getStore()
    .entries.get(userId)
    ?.find((x) => Math.abs(x.start - s) < 1000 && (!Number.isFinite(t) || Math.abs(x.stop - t) < 1000));
  if (!e) throw new ApiError(404, "Time entry not found");
  return e;
}

function entryByIds(userId: string, ids: unknown) {
  const list = (Array.isArray(ids) ? ids : typeof ids === "string" ? ids.split(",") : []).map((x) => String(x).trim()).filter(Boolean);
  if (!list.length) throw new ApiError(422, "local_activity_duration_id is required");
  const found = list.map((id) => findEntry(id)).filter((e): e is TimeEntry => !!e && e.userId === userId);
  if (!found.length) throw new ApiError(404, "Time entry not found");
  return found;
}

function applyEdit(target: TimeEntry, input: EntryInput, tz: string) {
  const p = parseInput(input, tz, { notesRequired: true });
  assertNoOverlap(target.userId, p.start, p.stop, [target.id]);
  return updateEntry(target.id, { projectId: p.projectId, task: p.task, start: p.start, stop: p.stop, notes: p.notes, createdBy: ACTOR() });
}

/**
 * PUT /edit/time-entries-slot | /manual-entry-edit/time-entries-slot ?old_started_at&old_stopped_at&timezone_str
 *   body {entries:{started_at_utc, stopped_at_utc, project_id, task_id, notes}, local_activity_duration_id[], client_local_id[]}
 * PUT /edit/time-entries | /manual-entry-edit/time-entries (same query) — body is the entry object itself.
 */
export function editTimeEntry(userId: string, query: URLSearchParams, body: Record<string, unknown>, slot: boolean) {
  requireUser(userId);
  const tz = safeTz(query.get("timezone_str"));
  let target: TimeEntry;
  let input: EntryInput;
  if (slot && body.entries && !Array.isArray(body.entries)) {
    const found = entryByIds(userId, body.local_activity_duration_id);
    target = found[0];
    // Merged blocks: the extra ones are folded into the first.
    for (const extra of found.slice(1)) deleteEntry(extra.id);
    input = body.entries as EntryInput;
  } else {
    target = entryByTimes(userId, query.get("old_started_at"), query.get("old_stopped_at"), tz);
    input = body as EntryInput;
  }
  const e = applyEdit(target, input, tz)!;
  return ok("Time entry updated successfully", { data: toApiEntry(e, tz) });
}

/**
 * PUT /split/time-entries-slot/{org}/{user}?timezone_str — body {entries:[…], local_activity_duration_id[], client_local_id[]}
 * PUT /split/time-entries/{org}/{user}?started_at&stopped_at&timezone_str — body [ {started_at_utc, stopped_at_utc, project_id, task_id, notes}, … ]
 */
export function splitTimeEntry(userId: string, query: URLSearchParams, body: unknown) {
  requireUser(userId);
  const tz = safeTz(query.get("timezone_str"));
  let target: TimeEntry;
  let parts: EntryInput[];
  if (Array.isArray(body)) {
    target = entryByTimes(userId, query.get("started_at"), query.get("stopped_at"), tz);
    parts = body as EntryInput[];
  } else {
    const b = (body ?? {}) as Record<string, unknown>;
    target = entryByIds(userId, b.local_activity_duration_id)[0];
    parts = Array.isArray(b.entries) ? (b.entries as EntryInput[]) : [];
  }
  if (parts.length < 2) throw new ApiError(422, "At least two splits are required");
  const parsed = parts.map((p) => parseInput(p, tz, { notesRequired: true }));
  if (Math.abs(parsed[0].start - target.start) >= 1000) throw new ApiError(422, "The first split must start at the original start time");
  if (Math.abs(parsed[parsed.length - 1].stop - target.stop) >= 1000) throw new ApiError(422, "The last split must end at the original end time");
  for (let i = 0; i < parsed.length - 1; i++) {
    if (Math.abs(parsed[i].stop - parsed[i + 1].start) >= 1000) throw new ApiError(422, "Splits must be sequential with no gaps or overlaps");
  }
  // Keep exact original edges.
  parsed[0].start = target.start;
  parsed[parsed.length - 1].stop = target.stop;
  const created = replaceEntry(
    target.id,
    parsed.map((p) => ({ projectId: p.projectId, task: p.task, start: p.start, stop: p.stop, notes: p.notes, createdBy: ACTOR() })),
  );
  return ok("Time entry splitted successfully", { data: created.map((e) => toApiEntry(e, tz)) });
}

/**
 * DELETE /delete/time-entries-block/{org}/{user}?started_at_utc&stopped_at_utc&timezone_str — body {local_activity_duration_id[], reasons}
 * DELETE /manual-delete/time-entries | /delete/time-entries (same query) — body {reason}
 */
export function deleteTimeEntry(userId: string, query: URLSearchParams, body: Record<string, unknown>, kind: "block" | "manual" | "tracked") {
  requireUser(userId);
  const tz = safeTz(query.get("timezone_str"));
  const reason = String(body.reasons ?? body.reason ?? "").trim();
  if (!reason) throw new ApiError(422, "Reason is required");
  const targets = kind === "block" ? entryByIds(userId, body.local_activity_duration_id) : [entryByTimes(userId, query.get("started_at_utc"), query.get("stopped_at_utc"), tz)];
  if (kind === "manual" && !targets[0].isManual) throw new ApiError(422, "Time entry is not a manual entry");
  for (const t of targets) deleteEntry(t.id);
  return ok("Time entry deleted successfully", { deleted: targets.length });
}

/**
 * POST /bulk-delete/time-entries/{org}/{user} — body {timezone_str, items:[{started_at_utc, stopped_at_utc, type: block|manual|tracked,
 * local_activity_duration_id?, reasons?}]}
 */
export function bulkDeleteTimeEntries(userId: string, body: Record<string, unknown>) {
  requireUser(userId);
  const tz = safeTz(typeof body.timezone_str === "string" ? body.timezone_str : undefined);
  const items = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  if (!items.length) throw new ApiError(422, "items is required");
  const victims = new Set<string>();
  for (const it of items) {
    if (it.type === "block" && it.local_activity_duration_id) {
      entryByIds(userId, it.local_activity_duration_id).forEach((e) => victims.add(e.id));
    } else {
      victims.add(entryByTimes(userId, it.started_at_utc, it.stopped_at_utc, tz).id);
    }
  }
  for (const id of victims) deleteEntry(id);
  return ok(`${victims.size} time ${victims.size === 1 ? "entry" : "entries"} deleted successfully`, { deleted: victims.size });
}

/**
 * Calendar › Schedules mock: shift rules (recurring weekly schedules), one-day overrides and
 * the shift report (Day / Week / Month grid). Seeds live in seed-timeoff.ts (SHIFT_RULES).
 *
 * status_tag of a past shift is derived from the member's tracked time that day:
 * no time → "missed", much less than expected → "abandoned", well over → "overtime",
 * first entry after start + buffer → "late", otherwise "on-time". Today → null, future → "upcoming".
 */
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { DEMO_USER_ID, MEMBERS } from "./seed";
import { SHIFT_RULES } from "./seed-timeoff";
import type { Ctx } from "./engine";
import { ApiError } from "./http";
import { getStore, memberOf, type MockStore } from "./store";
import { leaveOn, ORG_TZ, todayOrg } from "./timeoff";
import { localDate } from "./tz";
import type { ShiftDay, ShiftReportResponse, ShiftRuleOverview } from "@/lib/types/schedules";

dayjs.extend(isoWeek);

export interface ShiftRuleDay {
  day: number;
  start_time: string;
  end_time: string;
  is_day_lock: boolean;
  is_time_lock: boolean;
}

export interface ShiftRuleRec {
  id: number;
  userId: string;
  name: string;
  shift_type: "fixed" | "flexible" | "hybrid_flex";
  flexible_type: string | null;
  days: ShiftRuleDay[];
  minimum_hour: string;
  shift_buffer_seconds: number | null;
  timezone: string;
  effective_from: string;
  effective_to: string | null;
  status: "active" | "inactive";
}

export interface ShiftOverride {
  userId: string;
  date: string;
  ruleId: number | null;
  name: string;
  start: string;
  end: string;
  minimum_hour: string;
  shift_buffer_seconds: number | null;
  shift_type: ShiftRuleRec["shift_type"];
  status: "active" | "inactive";
  is_day_lock: boolean;
  is_time_lock: boolean;
  deleted?: boolean;
}

export interface SchedulesState {
  rules: ShiftRuleRec[];
  overrides: Map<string, ShiftOverride>;
  seq: number;
}

export function buildSchedules(_store: MockStore): SchedulesState {
  const state: SchedulesState = { rules: [], overrides: new Map(), seq: 700 };
  const today = dayjs(localDate(Date.now(), ORG_TZ));
  for (const r of SHIFT_RULES) {
    const m = MEMBERS[r.member];
    if (!m) continue;
    state.rules.push({
      id: ++state.seq,
      userId: m.user_id,
      name: r.name,
      shift_type: r.shift_type,
      flexible_type: r.shift_type === "hybrid_flex" ? "core_hours" : null,
      days: r.days.map((day) => {
        const [s, e] = r.dayTimes?.[day] ?? [r.start, r.end];
        return { day, start_time: s, end_time: e, is_day_lock: false, is_time_lock: false };
      }),
      minimum_hour: r.minimum_hour,
      shift_buffer_seconds: r.shift_buffer_seconds,
      timezone: ORG_TZ,
      effective_from: today.subtract(r.effectiveDaysAgo, "day").format("YYYY-MM-DD"),
      effective_to: null,
      status: "active",
    });
  }
  return state;
}

const sched = () => getStore().schedules!;

/** "08:00:00" -> "8:00:00" (live minimum_hour_interval format). */
const interval = (hms: string | null) => (hms ? hms.replace(/^0(\d):/, "$1:") : "00:00:00");
const bufferInterval = (sec: number | null) => (sec ? `00:${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}` : null);
const secs = (hms: string) => {
  const [h = 0, m = 0, s = 0] = hms.split(":").map(Number);
  return h * 3600 + m * 60 + s;
};

function ruleOn(state: SchedulesState, userId: string, date: string) {
  return state.rules.find((r) => r.userId === userId && r.status === "active" && r.effective_from <= date && (!r.effective_to || r.effective_to >= date));
}

interface ResolvedShift {
  ruleId: number | null;
  name: string;
  shift_type: ShiftRuleRec["shift_type"];
  flexible_type: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  start: string;
  end: string;
  minimum_hour: string;
  buffer: number | null;
  is_day_lock: boolean;
  is_time_lock: boolean;
  status: "active" | "inactive";
}

export function shiftOn(userId: string, date: string, state = sched()): ResolvedShift | null {
  const rule = ruleOn(state, userId, date);
  const day = rule?.days.find((d) => d.day === dayjs(date).isoWeekday());
  const ov = state.overrides.get(`${userId}|${date}`);
  if (ov?.deleted) return null;
  if (ov)
    return {
      ruleId: ov.ruleId,
      name: ov.name,
      shift_type: ov.shift_type,
      flexible_type: ov.shift_type === "hybrid_flex" ? "core_hours" : null,
      scheduledStart: day?.start_time ?? ov.start,
      scheduledEnd: day?.end_time ?? ov.end,
      start: ov.start,
      end: ov.end,
      minimum_hour: ov.minimum_hour,
      buffer: ov.shift_buffer_seconds,
      is_day_lock: ov.is_day_lock,
      is_time_lock: ov.is_time_lock,
      status: ov.status,
    };
  if (!rule || !day) return null;
  return {
    ruleId: rule.id,
    name: rule.name,
    shift_type: rule.shift_type,
    flexible_type: rule.flexible_type,
    scheduledStart: day.start_time,
    scheduledEnd: day.end_time,
    start: day.start_time,
    end: day.end_time,
    minimum_hour: rule.minimum_hour,
    buffer: rule.shift_buffer_seconds,
    is_day_lock: day.is_day_lock,
    is_time_lock: day.is_time_lock,
    status: rule.status,
  };
}

function statusTag(store: MockStore, userId: string, date: string, s: ResolvedShift, today: string) {
  if (date > today) return "upcoming";
  if (date === today) return null;
  const rec = store.records.get(userId)?.get(date);
  const worked = rec?.regularSeconds ?? 0;
  if (worked <= 0) return "missed";
  const expected = secs(s.minimum_hour) || secs(s.end) - secs(s.start);
  if (worked < expected * 0.5) return "abandoned";
  if (worked > expected + 3600) return "overtime";
  const m = memberOf(userId)!;
  const first = (store.entries.get(userId) ?? []).find((e) => localDate(e.start, m.timezone) === date);
  if (first) {
    const startedAt = dayjs(new Date(first.start).toLocaleString("en-US", { timeZone: m.timezone }));
    const startSec = startedAt.hour() * 3600 + startedAt.minute() * 60;
    if (startSec > secs(s.start) + (s.buffer ?? 0)) return "late";
  }
  return "on-time";
}

const EMPTY_DAY: Omit<ShiftDay, "time_offs"> = {
  source: null,
  shift_rule_id: null,
  shift_type: null,
  flexible_type: null,
  scheduled_start: null,
  scheduled_end: null,
  start: null,
  end: null,
  minimum_hour_interval: "00:00:00",
  shift_buffer_seconds: null,
  shift_buffer_interval: null,
  is_day_lock: false,
  is_time_lock: false,
  status: null,
  status_tag: null,
};

/** Date range of a report: Day = the date, Week = Monday–Sunday, Month = the calendar month. */
export function reportRange(type: string, date: string) {
  const d = dayjs(date);
  if (type === "Day") return { start: date, end: date };
  if (type === "Month") return { start: d.startOf("month").format("YYYY-MM-DD"), end: d.endOf("month").format("YYYY-MM-DD") };
  return { start: d.isoWeekday(1).format("YYYY-MM-DD"), end: d.isoWeekday(7).format("YYYY-MM-DD") };
}

/** GET /shift-report/{org}?report_type=Day|Week|Month&week=YYYY-MM-DD&offset&limit&search&user_ids */
export function shiftReport(ctx: Ctx, sp: URLSearchParams): ShiftReportResponse {
  const store = getStore();
  const state = sched();
  const type = ["Day", "Week", "Month"].find((t) => t.toLowerCase() === (sp.get("report_type") ?? "week").toLowerCase()) ?? "Week";
  const today = todayOrg();
  const { start, end } = sp.get("start_date") && sp.get("end_date") ? { start: sp.get("start_date")!, end: sp.get("end_date")! } : reportRange(type, sp.get("week") || sp.get("date") || today);
  const limit = Math.max(1, Math.min(200, Number(sp.get("limit") ?? 10) || 10));
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const search = (sp.get("search") ?? "").toLowerCase();
  const userIds = (sp.get("user_ids") ?? sp.get("filter_user_id") ?? "").split(",").filter(Boolean);
  const members =
    ctx.scenario === "empty"
      ? []
      : [...MEMBERS]
          .filter((m) => !search || m.full_name.toLowerCase().includes(search) || m.email.toLowerCase().includes(search))
          .filter((m) => !userIds.length || userIds.includes(m.user_id))
          .sort((a, b) => a.full_name.localeCompare(b.full_name));
  const dates: string[] = [];
  for (let d = dayjs(start); !d.isAfter(dayjs(end), "day"); d = d.add(1, "day")) dates.push(d.format("YYYY-MM-DD"));
  return {
    report_type: type.toLowerCase(),
    week_start: start,
    week_end: end,
    timezone: ORG_TZ,
    org_timezone: ORG_TZ,
    total: members.length,
    limit,
    offset,
    items: members.slice(offset, offset + limit).map((m) => {
      const shifts: Record<string, ShiftDay> = {};
      for (const date of dates) {
        const s = shiftOn(m.user_id, date, state);
        const time_offs = leaveOn(m.user_id, date, undefined, true).map((l) => ({
          request_id: l.request_id,
          policy_name: l.policy_name,
          status: l.status,
          leave_type: l.duration_state,
          is_paid: l.is_paid,
          started_at: l.started_at,
          stopped_at: l.stopped_at,
        }));
        shifts[date] = s
          ? {
              source: "shift",
              shift_rule_id: s.ruleId,
              shift_type: s.shift_type,
              flexible_type: s.flexible_type,
              scheduled_start: s.scheduledStart,
              scheduled_end: s.scheduledEnd,
              start: s.start,
              end: s.end,
              time_offs,
              minimum_hour_interval: interval(s.minimum_hour),
              shift_buffer_seconds: s.buffer,
              shift_buffer_interval: bufferInterval(s.buffer),
              is_day_lock: s.is_day_lock,
              is_time_lock: s.is_time_lock,
              status: s.status,
              status_tag: statusTag(store, m.user_id, date, s, today),
            }
          : { ...EMPTY_DAY, time_offs };
      }
      return { user_id: m.user_id, full_name: m.full_name, email: m.email, profile_image_url: m.profile_image_url, timezone: m.timezone, shifts };
    }),
  };
}

const HMS = /^\d{2}:\d{2}(:\d{2})?$/;
const hms = (v: unknown, label: string) => {
  const s = String(v ?? "");
  if (!HMS.test(s)) throw new ApiError(400, `${label} is required`);
  return s.length === 5 ? `${s}:00` : s;
};
const SHIFT_TYPES = ["fixed", "flexible", "hybrid_flex"] as const;

/** POST /shift-create/{org} — body { users, name, status, shift_type, minimum_hour, shift_buffer_seconds, timezone, days_of_week[], effective_from, effective_to }. */
export function createShift(body: Record<string, unknown>) {
  const state = sched();
  const users = Array.isArray(body.users) ? body.users.map(String).filter((u) => memberOf(u)) : [];
  if (!users.length) throw new ApiError(400, "Select at least one member");
  const days = (Array.isArray(body.days_of_week) ? body.days_of_week : []) as Record<string, unknown>[];
  if (!days.length) throw new ApiError(400, "Select at least one work day");
  const from = String(body.effective_from ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new ApiError(400, "Effective from date is required");
  const to = body.effective_to ? String(body.effective_to) : null;
  const type = (SHIFT_TYPES as readonly string[]).includes(String(body.shift_type)) ? (body.shift_type as ShiftRuleRec["shift_type"]) : "fixed";
  const ruleDays = days.map((d) => {
    const start = hms(d.start_time, "Start time");
    const end = hms(d.end_time, "End time");
    if (end <= start) throw new ApiError(400, "End time must be after start time");
    return { day: Math.min(7, Math.max(1, Number(d.day) || 1)), start_time: start, end_time: end, is_day_lock: !!d.is_day_lock, is_time_lock: !!d.is_time_lock };
  });
  const created: ShiftRuleRec[] = [];
  for (const userId of users) {
    // A new rule replaces the member's current rule from its effective date.
    for (const r of state.rules)
      if (r.userId === userId && r.status === "active" && (!r.effective_to || r.effective_to >= from)) {
        if (r.effective_from >= from) r.status = "inactive";
        else r.effective_to = dayjs(from).subtract(1, "day").format("YYYY-MM-DD");
      }
    const rule: ShiftRuleRec = {
      id: ++state.seq,
      userId,
      name: String(body.name ?? "").trim() || "Shift",
      shift_type: type,
      flexible_type: type === "hybrid_flex" ? "core_hours" : body.flexible_type ? String(body.flexible_type) : null,
      days: ruleDays,
      minimum_hour: HMS.test(String(body.minimum_hour ?? "")) ? hms(body.minimum_hour, "Expected hours") : "08:00:00",
      shift_buffer_seconds: body.shift_buffer_seconds == null ? null : Number(body.shift_buffer_seconds) || null,
      timezone: String(body.timezone || ORG_TZ),
      effective_from: from,
      effective_to: to,
      status: "active",
    };
    state.rules.push(rule);
    created.push(rule);
  }
  return { status: "success", message: "Shift created successfully", shift_rule_ids: created.map((r) => r.id) };
}

function overrideFromBody(userId: string, body: Record<string, unknown>, base: ResolvedShift | null): ShiftOverride {
  const date = String(body.shift_date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(400, "Shift date is required");
  const start = hms(body.start_time, "Start time");
  const end = hms(body.end_time, "End time");
  if (end <= start) throw new ApiError(400, "End time must be after start time");
  const type = (SHIFT_TYPES as readonly string[]).includes(String(body.shift_type)) ? (body.shift_type as ShiftRuleRec["shift_type"]) : (base?.shift_type ?? "fixed");
  return {
    userId,
    date,
    ruleId: body.shift_rule_id != null ? Number(body.shift_rule_id) : (base?.ruleId ?? null),
    name: String(body.name ?? base?.name ?? "Shift"),
    start,
    end,
    minimum_hour: HMS.test(String(body.minimum_hour ?? "")) ? hms(body.minimum_hour, "Expected hours") : (base?.minimum_hour ?? "08:00:00"),
    shift_buffer_seconds: body.shift_buffer_seconds == null ? (base?.buffer ?? null) : Number(body.shift_buffer_seconds) || null,
    shift_type: type,
    status: body.status === "inactive" ? "inactive" : "active",
    is_day_lock: !!body.is_day_lock,
    is_time_lock: !!body.is_time_lock,
  };
}

/** PUT /shift-update/{org}/{user} — "Only this shift": overrides one day. */
export function updateShift(userId: string, body: Record<string, unknown>) {
  if (!memberOf(userId)) throw new ApiError(404, "Member not found");
  const state = sched();
  const date = String(body.shift_date ?? "");
  if (date && date < todayOrg()) throw new ApiError(400, "Past shifts cannot be edited");
  const ov = overrideFromBody(userId, body, date ? shiftOn(userId, date, state) : null);
  state.overrides.set(`${userId}|${ov.date}`, ov);
  return { status: "success", message: "Shift updated successfully" };
}

/** PUT /user/shift-rule-update/{org}/{user}?effective_from=… — "This and all future shifts": new rule times from that date. */
export function updateShiftRule(userId: string, effectiveFrom: string, body: Record<string, unknown>) {
  const state = sched();
  const rule = ruleOn(state, userId, effectiveFrom);
  if (!rule) throw new ApiError(404, "Shift rule not found");
  const start = hms(body.start_time, "Start time");
  const end = hms(body.end_time, "End time");
  if (end <= start) throw new ApiError(400, "End time must be after start time");
  const next: ShiftRuleRec = {
    ...rule,
    id: ++state.seq,
    name: String(body.name ?? rule.name),
    shift_type: (SHIFT_TYPES as readonly string[]).includes(String(body.shift_type)) ? (body.shift_type as ShiftRuleRec["shift_type"]) : rule.shift_type,
    days: rule.days.map((d) => ({ ...d, start_time: start, end_time: end })),
    minimum_hour: HMS.test(String(body.minimum_hour ?? "")) ? hms(body.minimum_hour, "Expected hours") : rule.minimum_hour,
    shift_buffer_seconds: body.shift_buffer_seconds == null ? rule.shift_buffer_seconds : Number(body.shift_buffer_seconds) || null,
    effective_from: effectiveFrom,
  };
  if (rule.effective_from >= effectiveFrom) rule.status = "inactive";
  else rule.effective_to = dayjs(effectiveFrom).subtract(1, "day").format("YYYY-MM-DD");
  state.rules.push(next);
  for (const [k, ov] of state.overrides) if (ov.userId === userId && ov.date >= effectiveFrom && !ov.deleted) state.overrides.delete(k);
  return { status: "success", message: "Shift updated successfully" };
}

/** DELETE /shift-delete/{org} — body { user_id, shift_date, shift_rule_id }: removes one day's shift. */
export function deleteShift(body: Record<string, unknown>) {
  const userId = String(body.user_id ?? "");
  const date = String(body.shift_date ?? "");
  if (!memberOf(userId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(400, "user_id and shift_date are required");
  const state = sched();
  if (!shiftOn(userId, date, state)) throw new ApiError(404, "Shift not found");
  state.overrides.set(`${userId}|${date}`, { userId, date, ruleId: null, name: "", start: "00:00:00", end: "00:00:00", minimum_hour: "00:00:00", shift_buffer_seconds: null, shift_type: "fixed", status: "inactive", is_day_lock: false, is_time_lock: false, deleted: true });
  return { status: "success", message: "Shift deleted successfully" };
}

/** GET /user/shift-rule-overview/{org}/{user} */
export function shiftRuleOverview(userId: string): ShiftRuleOverview {
  const m = memberOf(userId) ?? memberOf(DEMO_USER_ID)!;
  return {
    user_id: m.user_id,
    user_name: m.full_name,
    shift_rules: sched()
      .rules.filter((r) => r.userId === m.user_id && r.status === "active")
      .map((r) => ({ shift_name: r.name, effective_from: r.effective_from, effective_to: r.effective_to, status: r.status, shift_type: r.shift_type })),
  };
}

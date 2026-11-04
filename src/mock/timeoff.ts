/**
 * Time off mock engine: policies, member assignments, requests, balances, adjustments.
 *
 * Built together with the rest of the store (see `buildStore` in store.ts → `buildTimeOff`), so
 * POST /api/__reset regenerates it. Writes (create / edit / approve / deny / delete requests,
 * policy CRUD, balance adjustments) live in memory.
 *
 * Integrations:
 *  - approved leave days add PTO seconds to the Dashboard day records (`DayRecord.ptoSeconds`),
 *  - Timesheets (`time_off` per day) and Screenshots (`has_time_off` / `time_off`) read `leaveOn()`,
 *  - balances deduct approved hours (pending hours are shown separately).
 */
import dayjs from "dayjs";
import type {
  AuditRow,
  AuditTrailResponse,
  BalanceRow,
  BalanceSummary,
  BalancesResponse,
  MonthViewEntry,
  MonthViewResponse,
  TimeOffAttachment,
  TimeOffDetail,
  TimeOffPolicy,
  TimeOffPolicyDetail,
  TimeOffPolicyList,
  TimeOffRequest,
  TimeOffRequestsResponse,
  TimeOffStatus,
  UserTimeOffPolicy,
  WeekViewLeave,
  WeekViewMember,
  WeekViewResponse,
  LeaveType,
} from "@/lib/types/timeoff";
import { DEMO_USER_ID, MEMBERS, ORGANIZATION, PROJECTS, TEAMS } from "./seed";
import { ADJUSTMENTS, CLIENTS, POLICIES, POLICY_ASSIGNMENTS, REQUESTS } from "./seed-timeoff";
import type { Ctx } from "./engine";
import { ApiError } from "./http";
import { getStore, memberOf, syncDay, type DayRecord, type MockStore } from "./store";
import { localDate, localDayStartMs, utcIso } from "./tz";

export const ORG_TZ = ORGANIZATION.time_zone;
const FULL_DAY_SECONDS = 8 * 3600;

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export type PolicyRec = Omit<TimeOffPolicy, "users_count" | "client_name" | "created_at" | "updated_at"> & { createdAt: number; updatedAt: number };

export interface RequestRec {
  id: number;
  userId: string;
  policyId: number;
  /** Policy name when the request was made (kept if the policy is deleted). */
  policyName: string;
  start: string;
  end: string;
  leaveType: LeaveType;
  details: TimeOffDetail[];
  status: TimeOffStatus;
  notes: string;
  reasonNotes: string | null;
  approvedBy: string | null;
  timezone: string;
  createdAt: number;
  updatedAt: number;
  attachments: TimeOffAttachment[];
}

export interface AdjustmentRec {
  id: number;
  userId: string;
  policyId: number;
  delta: number;
  from: number;
  to: number;
  reason: string;
  byUserId: string;
  at: number;
}

export interface TimeOffState {
  policies: PolicyRec[];
  /** userId -> [{ policyId, assignedAt }] */
  assignments: Map<string, { policyId: number; assignedAt: number }[]>;
  requests: RequestRec[];
  adjustments: AdjustmentRec[];
  /** PTO seconds the generator put on a day before leave was applied ("userId|date"). */
  basePto: Map<string, number>;
  seq: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const naive = (ms: number) => utcIso(ms).replace(/\.\d+Z?$/, "").replace(/Z$/, "");
export const todayOrg = () => localDate(Date.now(), ORG_TZ);

function nextWeekday(d: dayjs.Dayjs) {
  if (d.day() === 6) return d.add(2, "day");
  if (d.day() === 0) return d.add(1, "day");
  return d;
}

/** Working days (Mon–Fri) between two dates, inclusive; `excludeWeekends=false` keeps every day. */
export function daysBetween(start: string, end: string, excludeWeekends = true) {
  const out: string[] = [];
  for (let d = dayjs(start); !d.isAfter(dayjs(end), "day"); d = d.add(1, "day")) {
    if (excludeWeekends && (d.day() === 0 || d.day() === 6)) continue;
    out.push(d.format("YYYY-MM-DD"));
  }
  return out;
}

function makeDetails(state: TimeOffState, dates: string[], from = "09:00", to = "17:00"): TimeOffDetail[] {
  return dates.map((date) => ({ id: ++state.seq, started_at_datetime: `${date}T${from}:00`, stopped_at_datetime: `${date}T${to}:00` }));
}

export const detailSeconds = (d: TimeOffDetail) => Math.max(0, dayjs(d.stopped_at_datetime).diff(dayjs(d.started_at_datetime), "second"));
export const requestSeconds = (r: { details: TimeOffDetail[] }) => r.details.reduce((s, d) => s + detailSeconds(d), 0);
const requestHours = (r: { details: TimeOffDetail[] }) => requestSeconds(r) / 3600;

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

export function buildTimeOff(store: MockStore): TimeOffState {
  const now = Date.now();
  const state: TimeOffState = { policies: [], assignments: new Map(), requests: [], adjustments: [], basePto: new Map(), seq: 1000 };
  for (const p of POLICIES) {
    const created = now - p.createdDaysAgo * 86_400_000;
    state.policies.push({
      id: p.id,
      name: p.name,
      policy_type: p.policy_type,
      accrual_year_anchor: p.accrual_year_anchor,
      auto_add_new_users: false,
      allow_negative_balances: !!p.allow_negative_balances,
      max_negative_balance: p.max_negative_balance ?? 0,
      balance_rolls_over_annually: p.rollover_cap != null,
      requires_approval: p.requires_approval,
      paid: p.paid,
      is_paid: p.paid,
      client_id: p.client_id,
      is_billable: p.is_billable,
      hours_per_year: p.hours_per_year ?? 0,
      starting_balance: p.starting_balance ?? 0,
      accrual_per_month: p.accrual_per_month ?? 0,
      accrual_day: "first_day_of_month",
      allow_prorated: p.policy_type === "joined_date",
      hours_worked_accrued: p.hours_worked_accrued ?? 0,
      hours_worked_per_worked: p.hours_worked_per_worked ?? 0,
      tenure_accrual_enabled: false,
      tenure_tiers: [],
      tenure_increase_hours: 0,
      tenure_increase_interval_years: 0,
      tenure_max_annual_hours: null,
      rollover_cap: p.rollover_cap ?? (p.rollover_cap === null ? null : 0),
      rollover_expiry_days: p.rollover_expiry_days ?? null,
      createdAt: created,
      updatedAt: created + 3_600_000,
    });
  }
  POLICY_ASSIGNMENTS.forEach((ids, i) => {
    const m = MEMBERS[i];
    if (!m) return;
    state.assignments.set(
      m.user_id,
      ids.map((policyId, k) => ({ policyId, assignedAt: Math.max(state.policies.find((p) => p.id === policyId)!.createdAt, now - (200 - k * 9) * 86_400_000) })),
    );
  });

  const monthStart = dayjs(todayOrg()).startOf("month");
  REQUESTS.forEach((s, i) => {
    const m = MEMBERS[s.member];
    const policy = state.policies.find((p) => p.id === s.policy);
    if (!m || !policy) return;
    const base = monthStart.add(s.m, "month");
    const from = nextWeekday(base.date(Math.min(s.from, base.daysInMonth())));
    let to = dayjs(base.date(Math.min(s.to ?? s.from, base.daysInMonth())));
    if (to.isBefore(from)) to = from;
    if (!s.to) to = from;
    const start = from.format("YYYY-MM-DD");
    const end = to.format("YYYY-MM-DD");
    // One leave per member per date (same rule as the API).
    if (findOverlap(state, m.user_id, start, end)) return;
    const [pf, pt] = s.partial ? s.partial.split("-") : ["09:00", "17:00"];
    const details = makeDetails(state, daysBetween(start, end), pf, pt);
    if (!details.length) return;
    const created = Math.min(now - 3_600_000 * (5 + i), from.valueOf() - 86_400_000 * (3 + (i % 9)) + 3_600_000 * (8 + (i % 7)));
    const approver = MEMBERS[s.approver ?? (m.user_id === MEMBERS[0].user_id ? 1 : 0)];
    state.requests.push({
      id: 2000 + i,
      userId: m.user_id,
      policyId: policy.id,
      policyName: policy.name,
      start,
      end,
      leaveType: s.partial ? "partial" : "full_day",
      details,
      status: s.status,
      notes: s.notes,
      reasonNotes: s.reason ?? null,
      approvedBy: s.status === "approved" ? approver.full_name : null,
      timezone: ORG_TZ,
      createdAt: created,
      updatedAt: s.status === "submitted" ? created : created + 3_600_000 * (2 + (i % 20)),
      attachments: s.attachment
        ? [{ id: 5000 + i, ...s.attachment, url: s.attachment.content_type.startsWith("image/") ? "/mock-screens/screen-03.svg" : "/mock-attachments/sample.pdf" }]
        : [],
    });
  });

  for (const a of ADJUSTMENTS) {
    const m = MEMBERS[a.member];
    const by = MEMBERS[a.by];
    if (!m || !by) continue;
    state.adjustments.push({ id: ++state.seq, userId: m.user_id, policyId: a.policy, delta: a.hours, from: 0, to: 0, reason: a.reason, byUserId: by.user_id, at: now - a.daysAgo * 86_400_000 - 3_600_000 * 3 });
  }
  // from / to: replay adjustments in time order against the balance without them.
  const sorted = [...state.adjustments].sort((x, y) => x.at - y.at);
  const running = new Map<string, number>();
  for (const adj of sorted) {
    const key = `${adj.userId}|${adj.policyId}`;
    const before = running.get(key) ?? baseBalance(state, store, adj.userId, adj.policyId);
    adj.from = round2(before);
    adj.to = round2(before + adj.delta);
    running.set(key, adj.to);
  }

  // Remember the generator's PTO, then apply approved leave to the day records.
  for (const [userId, byDate] of store.records) for (const [date, rec] of byDate) if (rec.ptoSeconds > 0) state.basePto.set(`${userId}|${date}`, rec.ptoSeconds);
  const today = todayOrg();
  for (const r of state.requests) {
    if (r.status !== "approved") continue;
    // Seeded approved full days in the past: the member did not track time on those days.
    if (r.leaveType === "full_day") for (const date of r.details.map((d) => d.started_at_datetime.slice(0, 10))) if (date < today) clearWorkDay(store, r.userId, date);
    applyLeave(store, state, r.userId, r);
  }
  return state;
}

function clearWorkDay(store: MockStore, userId: string, date: string) {
  const m = memberOf(userId);
  const list = store.entries.get(userId);
  if (!m || !list) return;
  const from = localDayStartMs(date, m.timezone);
  const to = from + 24 * 3600_000;
  const kept = list.filter((e) => e.stop <= from || e.start >= to);
  if (kept.length === list.length) return;
  store.entries.set(userId, kept);
  const rec = store.records.get(userId)?.get(date);
  if (rec) {
    rec.regularSeconds = 0;
    rec.entries = [];
    rec.apps = [];
    rec.activity = 0;
  }
  syncDay(store, userId, date, []);
}

/** Recomputes PTO seconds on the day records touched by a request (base PTO + approved leave). */
function applyLeave(store: MockStore, state: TimeOffState, userId: string, r: Pick<RequestRec, "details">) {
  for (const d of r.details) {
    const date = d.started_at_datetime.slice(0, 10);
    const byDate = store.records.get(userId) ?? new Map<string, DayRecord>();
    store.records.set(userId, byDate);
    const leave = leaveOn(userId, date, state);
    const pto = Math.max(state.basePto.get(`${userId}|${date}`) ?? 0, leave.reduce((s, l) => s + l.duration_seconds, 0));
    const rec = byDate.get(date);
    if (rec) rec.ptoSeconds = pto;
    else if (pto > 0) byDate.set(date, { date, userId, regularSeconds: 0, ptoSeconds: pto, activity: 0, entries: [], apps: [] });
  }
}

export function timeOffState(): TimeOffState {
  return getStore().timeOff!;
}

/* ------------------------------------------------------------------ */
/* Lookups / serializers                                               */
/* ------------------------------------------------------------------ */

const clientName = (id: number) => CLIENTS.find((c) => c.id === id)?.name ?? "";
const policyOf = (state: TimeOffState, id: number) => state.policies.find((p) => p.id === id);
const usersCount = (state: TimeOffState, policyId: number) => [...state.assignments.values()].filter((list) => list.some((a) => a.policyId === policyId)).length;

export function serializePolicy(state: TimeOffState, p: PolicyRec): TimeOffPolicy {
  const { createdAt, updatedAt, ...rest } = p;
  return {
    id: rest.id,
    name: rest.name,
    policy_type: rest.policy_type,
    accrual_year_anchor: rest.accrual_year_anchor,
    auto_add_new_users: rest.auto_add_new_users,
    allow_negative_balances: rest.allow_negative_balances,
    max_negative_balance: rest.max_negative_balance,
    balance_rolls_over_annually: rest.balance_rolls_over_annually,
    requires_approval: rest.requires_approval,
    paid: rest.paid,
    is_paid: rest.is_paid,
    client_id: rest.client_id,
    client_name: clientName(rest.client_id),
    is_billable: rest.is_billable,
    hours_per_year: rest.hours_per_year,
    starting_balance: rest.starting_balance,
    accrual_per_month: rest.accrual_per_month,
    accrual_day: rest.accrual_day,
    allow_prorated: rest.allow_prorated,
    hours_worked_accrued: rest.hours_worked_accrued,
    hours_worked_per_worked: rest.hours_worked_per_worked,
    users_count: usersCount(state, p.id),
    created_at: naive(createdAt),
    updated_at: naive(updatedAt),
    tenure_accrual_enabled: rest.tenure_accrual_enabled,
    tenure_tiers: rest.tenure_tiers,
    tenure_increase_hours: rest.tenure_increase_hours,
    tenure_increase_interval_years: rest.tenure_increase_interval_years,
    tenure_max_annual_hours: rest.tenure_max_annual_hours,
    rollover_cap: rest.rollover_cap,
    rollover_expiry_days: rest.rollover_expiry_days,
  };
}

function serializeRequest(state: TimeOffState, r: RequestRec): TimeOffRequest {
  const m = memberOf(r.userId)!;
  return {
    id: r.id,
    user_id: r.userId,
    user_name: m.full_name,
    user_email: m.email,
    profile_image_url: m.profile_image_url,
    started_at_date: r.start,
    stopped_at_date: r.end,
    notes: r.notes,
    reason_notes: r.reasonNotes,
    leave_type: r.leaveType,
    time_off_policy_id: r.policyId,
    policy_name: policyOf(state, r.policyId)?.name ?? r.policyName,
    status: r.status,
    approved_by: r.approvedBy,
    timezone: r.timezone,
    created_at: naive(r.createdAt),
    updated_at: naive(r.updatedAt),
    details: r.details.map((d) => ({ ...d })),
    attachments: r.attachments.map((a) => ({ ...a })),
  };
}

/* ------------------------------------------------------------------ */
/* Balances                                                            */
/* ------------------------------------------------------------------ */

const yearOf = () => dayjs(todayOrg()).year();

function trackedHoursThisYear(store: MockStore, userId: string) {
  const year = String(yearOf());
  let s = 0;
  for (const [date, rec] of store.records.get(userId) ?? []) if (date.startsWith(year)) s += rec.regularSeconds;
  return s / 3600;
}

/** Hours granted by the policy this year (before adjustments and usage). */
export function accruedHours(state: TimeOffState, store: MockStore, userId: string, policyId: number) {
  const p = policyOf(state, policyId);
  if (!p) return 0;
  const today = dayjs(todayOrg());
  switch (p.policy_type) {
    case "none":
      return p.starting_balance;
    case "annual":
      return p.hours_per_year;
    case "monthly": {
      const months = today.month() + (p.accrual_day === "last_day_of_month" ? 0 : 1);
      return round2(p.accrual_per_month * months);
    }
    case "joined_date": {
      const assigned = state.assignments.get(userId)?.find((a) => a.policyId === policyId)?.assignedAt ?? Date.now();
      const from = dayjs(Math.max(assigned, today.startOf("year").valueOf()));
      const remaining = today.endOf("year").diff(from, "day");
      return round2(Math.min(p.hours_per_year, (p.hours_per_year / 360) * remaining));
    }
    case "hours_worked": {
      const per = p.hours_worked_per_worked || 1;
      const earned = Math.floor(trackedHoursThisYear(store, userId) / per) * p.hours_worked_accrued;
      return round2(p.hours_per_year > 0 ? Math.min(p.hours_per_year, earned) : earned);
    }
  }
  return 0;
}

function usedHours(state: TimeOffState, userId: string, policyId: number, status: TimeOffStatus, excludeId?: number | null) {
  const year = String(yearOf());
  return round2(
    state.requests
      .filter((r) => r.userId === userId && r.policyId === policyId && r.status === status && r.id !== excludeId)
      .reduce((s, r) => s + r.details.filter((d) => d.started_at_datetime.startsWith(year)).reduce((x, d) => x + detailSeconds(d) / 3600, 0), 0),
  );
}

const adjustmentTotal = (state: TimeOffState, userId: string, policyId: number) =>
  round2(state.adjustments.filter((a) => a.userId === userId && a.policyId === policyId).reduce((s, a) => s + a.delta, 0));

/** Balance without manual adjustments (used to replay seeded adjustments). */
function baseBalance(state: TimeOffState, store: MockStore, userId: string, policyId: number) {
  return accruedHours(state, store, userId, policyId) - usedHours(state, userId, policyId, "approved");
}

export function currentBalance(state: TimeOffState, store: MockStore, userId: string, policyId: number, excludeId?: number | null) {
  return round2(accruedHours(state, store, userId, policyId) + adjustmentTotal(state, userId, policyId) - usedHours(state, userId, policyId, "approved", excludeId));
}

/** POST /time-off/request/balance-summary/{org} */
export function balanceSummary(ctx: Ctx, body: Record<string, unknown>): BalanceSummary {
  const state = timeOffState();
  const store = getStore();
  const userId = String(body.user_id ?? DEMO_USER_ID);
  const policyId = Number(body.time_off_policy_id);
  const policy = policyOf(state, policyId);
  const m = memberOf(userId);
  if (!policy || !m) throw new ApiError(404, "Time off policy not found");
  const exclude = body.exclude_request_id != null ? Number(body.exclude_request_id) : null;
  const details = (Array.isArray(body.details) ? body.details : []) as TimeOffDetail[];
  const thisSec = details.reduce((s, d) => s + detailSeconds(d), 0);
  const current = ctx.scenario === "empty" ? 0 : currentBalance(state, store, userId, policyId, exclude);
  const pending = usedHours(state, userId, policyId, "submitted", exclude);
  const thisH = round2(thisSec / 3600);
  const remaining = round2(current - thisH - pending);
  return {
    user_id: userId,
    member_name: m.full_name,
    policy_id: policyId,
    policy_name: policy.name,
    year: yearOf(),
    current_balance_in_second: Math.round(current * 3600),
    this_request_in_second: thisSec,
    pending_requests_in_second: Math.round(pending * 3600),
    remaining_balance_in_second: Math.round(remaining * 3600),
    current_balance_hours: current,
    this_request_hours: thisH,
    pending_requests_hours: pending,
    remaining_balance_hours: remaining,
    carryover_remaining_in_second: null,
    carryover_remaining_hours: null,
    carryover_expires_at: null,
  };
}

/* ------------------------------------------------------------------ */
/* Requests                                                            */
/* ------------------------------------------------------------------ */

function listParam(sp: URLSearchParams, key: string) {
  return sp
    .getAll(key)
    .concat(sp.getAll(`filter[${key}]`))
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

function matchesFilters(r: RequestRec, sp: URLSearchParams) {
  const users = listParam(sp, "filter_user_id").concat(listParam(sp, "user_id"));
  if (users.length && !users.includes(r.userId)) return false;
  const policies = listParam(sp, "time_off_policy_id").map(Number);
  if (policies.length && !policies.includes(r.policyId)) return false;
  const teams = listParam(sp, "team_id").map(Number);
  if (teams.length && !memberOf(r.userId)?.teams.some((t) => teams.includes(t))) return false;
  return true;
}

const overlapsRange = (r: { start: string; end: string }, start?: string | null, end?: string | null) => (!end || r.start <= end) && (!start || r.end >= start);

/** GET /time-off/requests/{org}?limit&offset&status&start_date&end_date&timezone&filter_user_id&time_off_policy_id&team_id&search&sort */
export function listRequests(ctx: Ctx, sp: URLSearchParams): TimeOffRequestsResponse {
  const state = timeOffState();
  const limit = Math.max(1, Math.min(1000, Number(sp.get("limit") ?? 25) || 25));
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const start = sp.get("start_date");
  const end = sp.get("end_date");
  const status = sp.get("status") as TimeOffStatus | null;
  const search = (sp.get("search") ?? "").toLowerCase();
  const today = dayjs(todayOrg());
  const cm = { start_date: today.startOf("month").format("YYYY-MM-DD"), end_date: today.endOf("month").format("YYYY-MM-DD") };
  const base =
    ctx.scenario === "empty"
      ? []
      : state.requests.filter(
          (r) =>
            overlapsRange(r, start, end) &&
            matchesFilters(r, sp) &&
            (!search || memberOf(r.userId)!.full_name.toLowerCase().includes(search) || r.notes.toLowerCase().includes(search) || r.policyName.toLowerCase().includes(search)),
        );
  const counts = { submitted: 0, approved: 0, denied: 0 };
  for (const r of base) counts[r.status] += 1;
  const rows = base.filter((r) => !status || r.status === status);
  const sort = sp.get("sort") ?? "";
  const [sortKey, sortDir] = sort.startsWith("-") ? [sort.slice(1), "desc"] : [sort, "asc"];
  const key = (r: RequestRec) => (sortKey === "started_at_date" ? r.start : sortKey === "stopped_at_date" ? r.end : sortKey === "user_name" ? memberOf(r.userId)!.full_name : r.createdAt);
  rows.sort((a, b) => {
    if (!sortKey) return b.createdAt - a.createdAt || b.id - a.id;
    const x = key(a);
    const y = key(b);
    const c = x < y ? -1 : x > y ? 1 : 0;
    return sortDir === "desc" ? -c : c;
  });
  return {
    total: rows.length,
    current_month_total: rows.filter((r) => overlapsRange(r, cm.start_date, cm.end_date)).length,
    status_counts: counts,
    limit,
    offset,
    timezone: sp.get("timezone") || ORG_TZ,
    current_month: cm,
    items: rows.slice(offset, offset + limit).map((r) => serializeRequest(state, r)),
  };
}

function entryOf(state: TimeOffState, r: RequestRec, date: string): MonthViewEntry {
  const s = serializeRequest(state, r);
  return {
    id: s.id,
    user_id: s.user_id,
    user_name: s.user_name,
    user_email: s.user_email,
    profile_image_url: s.profile_image_url,
    status: s.status,
    leave_type: s.leave_type,
    time_off_policy_id: s.time_off_policy_id,
    policy_name: s.policy_name,
    started_at_date: s.started_at_date,
    stopped_at_date: s.stopped_at_date,
    is_start: date === r.start,
    is_end: date === r.end,
    duration_seconds: r.leaveType === "partial" ? requestSeconds(r) : null,
    details: s.details,
    notes: s.notes,
    reason_notes: s.reason_notes,
    approved_by: s.approved_by,
    timezone: s.timezone,
    created_at: s.created_at,
    updated_at: s.updated_at,
    attachment_count: s.attachments.length,
    attachments: s.attachments,
  };
}

const STATUS_ORDER: Record<TimeOffStatus, number> = { approved: 0, submitted: 1, denied: 2 };

function rangeOf(sp: URLSearchParams) {
  const today = dayjs(todayOrg());
  const start = sp.get("start_date") || today.startOf("month").format("YYYY-MM-DD");
  const end = sp.get("end_date") || today.endOf("month").format("YYYY-MM-DD");
  return { start, end: end < start ? start : end };
}

function viewRequests(ctx: Ctx, sp: URLSearchParams, start: string, end: string) {
  if (ctx.scenario === "empty") return [];
  const status = sp.get("status");
  return timeOffState()
    .requests.filter((r) => overlapsRange(r, start, end) && matchesFilters(r, sp) && (!status || r.status === status))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || memberOf(a.userId)!.full_name.localeCompare(memberOf(b.userId)!.full_name));
}

/** GET /time-off-request/month-view/{org}?start_date&end_date&status&timezone&filter_user_id&time_off_policy_id&team_id */
export function monthView(ctx: Ctx, sp: URLSearchParams): MonthViewResponse {
  const state = timeOffState();
  const { start, end } = rangeOf(sp);
  const reqs = viewRequests(ctx, sp, start, end);
  const data: Record<string, MonthViewEntry[]> = {};
  for (const date of daysBetween(start, end, false)) data[date] = reqs.filter((r) => r.start <= date && r.end >= date).map((r) => entryOf(state, r, date));
  return { timezone: sp.get("timezone") || "UTC", range: { start_date: start, end_date: end }, truncated: false, data };
}

/** GET /time-off-request/week-view/{org}?start_date&end_date&status&limit&… — one row per member with leave in the range. */
export function weekView(ctx: Ctx, sp: URLSearchParams): WeekViewResponse {
  const state = timeOffState();
  const { start, end } = rangeOf(sp);
  const days = daysBetween(start, end, false);
  const limit = Math.max(1, Math.min(500, Number(sp.get("limit") ?? 50) || 50));
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const reqs = viewRequests(ctx, sp, start, end);
  const members = MEMBERS.filter((m) => reqs.some((r) => r.userId === m.user_id));
  const items: WeekViewMember[] = members.slice(offset, offset + limit).map((m) => {
    const leaves: Record<string, WeekViewLeave[]> = {};
    for (const date of days) {
      leaves[date] = reqs
        .filter((r) => r.userId === m.user_id && r.start <= date && r.end >= date)
        .map((r) => {
          const e = entryOf(state, r, date);
          const visStart = r.start < start ? start : r.start;
          const visEnd = r.end > end ? end : r.end;
          return {
            id: e.id,
            status: e.status,
            leave_type: e.leave_type,
            time_off_policy_id: e.time_off_policy_id,
            policy_name: e.policy_name,
            started_at_date: e.started_at_date,
            stopped_at_date: e.stopped_at_date,
            bar_start: date === visStart,
            visible_span_days: dayjs(visEnd).diff(dayjs(visStart), "day") + 1,
            is_start: e.is_start,
            is_end: e.is_end,
            continues_before: r.start < start,
            continues_after: r.end > end,
            duration_seconds: e.duration_seconds,
            details: e.details,
            notes: e.notes,
            reason_notes: e.reason_notes,
            approved_by: e.approved_by,
            timezone: e.timezone,
            created_at: e.created_at,
            updated_at: e.updated_at,
            attachment_count: e.attachment_count,
            attachments: e.attachments,
          };
        });
    }
    return {
      user_id: m.user_id,
      full_name: m.full_name,
      email: m.email,
      profile_image_url: m.profile_image_url,
      timezone: m.timezone,
      teams: TEAMS.filter((t) => m.teams.includes(t.id)),
      leaves,
    };
  });
  return {
    view: days.length > 7 ? "month" : "week",
    range: { start_date: start, end_date: end },
    days,
    timezone: sp.get("timezone") || "UTC",
    total: members.length,
    limit,
    offset,
    truncated: false,
    items,
  };
}

/** The non-denied request of `userId` that shares a date with start..end (one leave per member per date). */
export function findOverlap(state: TimeOffState, userId: string, start: string, end: string, excludeId?: number) {
  return state.requests.find((r) => r.userId === userId && r.id !== excludeId && r.status !== "denied" && r.start <= end && r.end >= start);
}

interface RequestInput {
  started_at_date: string;
  stopped_at_date: string;
  notes: string;
  leave_type: LeaveType;
  time_off_policy_id: number;
  timezone: string;
  details: { started_at_datetime: string; stopped_at_datetime: string }[];
}

function parseRequestInput(data: Record<string, unknown>): RequestInput {
  const start = String(data.started_at_date ?? "");
  const end = String(data.stopped_at_date ?? start);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new ApiError(400, "Start and end dates are required");
  if (end < start) throw new ApiError(400, "End date must be same or after start date");
  const notes = String(data.notes ?? "").trim();
  if (!notes) throw new ApiError(400, "Notes are required");
  const policyId = Number(data.time_off_policy_id);
  if (!policyId) throw new ApiError(400, "Time off policy is required");
  const leave_type: LeaveType = data.leave_type === "partial" ? "partial" : "full_day";
  const raw = Array.isArray(data.details) ? (data.details as Record<string, unknown>[]) : [];
  const details = raw
    .map((d) => ({ started_at_datetime: String(d.started_at_datetime ?? "").slice(0, 19), stopped_at_datetime: String(d.stopped_at_datetime ?? "").slice(0, 19) }))
    .filter((d) => d.started_at_datetime && d.stopped_at_datetime);
  for (const d of details) if (!(d.stopped_at_datetime > d.started_at_datetime)) throw new ApiError(400, "End time must be after start time for each day.");
  return { started_at_date: start, stopped_at_date: end, notes, leave_type, time_off_policy_id: policyId, timezone: String(data.timezone || ORG_TZ), details };
}

function checkBalance(state: TimeOffState, userId: string, policyId: number, details: { started_at_datetime: string; stopped_at_datetime: string }[], excludeId?: number) {
  const p = policyOf(state, policyId)!;
  const hours = details.reduce((s, d) => s + detailSeconds({ id: 0, ...d }), 0) / 3600;
  const current = currentBalance(state, getStore(), userId, policyId, excludeId);
  const floor = p.allow_negative_balances ? -p.max_negative_balance : 0;
  if (current - hours < floor - 1e-9) {
    throw new ApiError(400, `Insufficient balance for ${p.name}: ${round2(current)} hrs available, ${round2(hours)} hrs requested`);
  }
}

/** POST /time-off/request/{org} — FormData `data` (JSON) + `files`. The request is always for the logged-in user. */
export function createRequest(data: Record<string, unknown>, files: { name: string; size: number; type: string }[] = [], userId = DEMO_USER_ID): TimeOffRequest {
  const state = timeOffState();
  const input = parseRequestInput(data);
  const policy = policyOf(state, input.time_off_policy_id);
  if (!policy || !state.assignments.get(userId)?.some((a) => a.policyId === policy.id)) throw new ApiError(404, "Time off policy not found");
  const overlap = findOverlap(state, userId, input.started_at_date, input.stopped_at_date);
  if (overlap) throw new ApiError(400, `Date range overlaps with an existing request (${overlap.start} → ${overlap.end})`);
  const details = input.details.length ? input.details : daysBetween(input.started_at_date, input.stopped_at_date).map((d) => ({ started_at_datetime: `${d}T09:00:00`, stopped_at_datetime: `${d}T17:00:00` }));
  if (!details.length) throw new ApiError(400, "No working days in the selected range");
  checkBalance(state, userId, policy.id, details);
  const now = Date.now();
  const autoApprove = !policy.requires_approval;
  const rec: RequestRec = {
    id: ++state.seq,
    userId,
    policyId: policy.id,
    policyName: policy.name,
    start: input.started_at_date,
    end: input.stopped_at_date,
    leaveType: input.leave_type,
    details: details.map((d) => ({ id: ++state.seq, ...d })),
    status: autoApprove ? "approved" : "submitted",
    notes: input.notes,
    reasonNotes: null,
    approvedBy: autoApprove ? memberOf(userId)!.full_name : null,
    timezone: input.timezone,
    createdAt: now,
    updatedAt: now,
    attachments: files.slice(0, 3).map((f) => ({ id: ++state.seq, file_name: f.name, file_size: f.size, content_type: f.type || "application/octet-stream", url: "/mock-attachments/sample.pdf" })),
  };
  state.requests.push(rec);
  if (rec.status === "approved") applyLeave(getStore(), state, userId, rec);
  return serializeRequest(state, rec);
}

function requestOf(state: TimeOffState, id: number) {
  const r = state.requests.find((x) => x.id === id);
  if (!r) throw new ApiError(404, "Time off request not found");
  return r;
}

/** PUT /time-off/request/{org}/{id} — edit a pending request (same FormData as create). */
export function updateRequest(id: number, data: Record<string, unknown>, files: { name: string; size: number; type: string }[] = []): TimeOffRequest {
  const state = timeOffState();
  const r = requestOf(state, id);
  if (r.status !== "submitted") throw new ApiError(400, "Only pending requests can be edited");
  const input = parseRequestInput(data);
  const policy = policyOf(state, input.time_off_policy_id);
  if (!policy || !state.assignments.get(r.userId)?.some((a) => a.policyId === policy.id)) throw new ApiError(404, "Time off policy not found");
  const overlap = findOverlap(state, r.userId, input.started_at_date, input.stopped_at_date, r.id);
  if (overlap) throw new ApiError(400, `Date range overlaps with an existing request (${overlap.start} → ${overlap.end})`);
  const details = input.details.length ? input.details : daysBetween(input.started_at_date, input.stopped_at_date).map((d) => ({ started_at_datetime: `${d}T09:00:00`, stopped_at_datetime: `${d}T17:00:00` }));
  checkBalance(state, r.userId, policy.id, details, r.id);
  r.policyId = policy.id;
  r.policyName = policy.name;
  r.start = input.started_at_date;
  r.end = input.stopped_at_date;
  r.leaveType = input.leave_type;
  r.details = details.map((d) => ({ id: ++state.seq, ...d }));
  r.notes = input.notes;
  r.timezone = input.timezone;
  r.updatedAt = Date.now();
  if (!policy.requires_approval) {
    r.status = "approved";
    r.approvedBy = memberOf(DEMO_USER_ID)!.full_name;
    applyLeave(getStore(), state, r.userId, r);
  }
  r.attachments.push(...files.slice(0, Math.max(0, 3 - r.attachments.length)).map((f) => ({ id: ++state.seq, file_name: f.name, file_size: f.size, content_type: f.type, url: "/mock-attachments/sample.pdf" })));
  return serializeRequest(state, r);
}

/** PATCH /status-update/time-off/{org}/{id} — body { status, reason_notes, timezone }. */
export function updateStatus(id: number, body: Record<string, unknown>, byUserId = DEMO_USER_ID): TimeOffRequest {
  const state = timeOffState();
  const r = requestOf(state, id);
  const status = String(body.status ?? "");
  if (!["approved", "denied", "submitted"].includes(status)) throw new ApiError(400, "Invalid status");
  if (status === "denied" && !String(body.reason_notes ?? "").trim()) throw new ApiError(400, "Rejection reason is required.");
  if (status === "approved") {
    const overlap = findOverlap(state, r.userId, r.start, r.end, r.id);
    if (overlap && overlap.status === "approved") throw new ApiError(400, `Date range overlaps with an existing request (${overlap.start} → ${overlap.end})`);
  }
  r.status = status as TimeOffStatus;
  r.approvedBy = status === "approved" ? memberOf(byUserId)!.full_name : null;
  r.reasonNotes = status === "denied" ? String(body.reason_notes).trim() : r.reasonNotes;
  r.updatedAt = Date.now();
  applyLeave(getStore(), state, r.userId, r);
  return serializeRequest(state, r);
}

/** DELETE /time-off/request/{org}/{id} — body { timezone, deleted_notes } (pending requests only). */
export function deleteRequest(id: number, body: Record<string, unknown>) {
  const state = timeOffState();
  const r = requestOf(state, id);
  if (!String(body.deleted_notes ?? "").trim()) throw new ApiError(400, "Deletion reason is required.");
  state.requests = state.requests.filter((x) => x.id !== id);
  applyLeave(getStore(), state, r.userId, r);
  return { status: "success", message: "Time off request deleted successfully", id };
}

/** DELETE /time-off/request/{org}/{req}/attachments/{att} */
export function deleteAttachment(requestId: number, attachmentId: number) {
  const r = requestOf(timeOffState(), requestId);
  const before = r.attachments.length;
  r.attachments = r.attachments.filter((a) => a.id !== attachmentId);
  if (r.attachments.length === before) throw new ApiError(404, "Attachment not found");
  return { status: "success", message: "Attachment deleted" };
}

/* ------------------------------------------------------------------ */
/* Leave lookups for Timesheets / Screenshots / Schedules              */
/* ------------------------------------------------------------------ */

export interface LeaveDay {
  request_id: number;
  policy_id: number;
  policy_name: string;
  duration_state: "full_day" | "partial";
  duration_seconds: number;
  is_paid: boolean;
  status: TimeOffStatus;
  started_at: string;
  stopped_at: string;
}

/** Leave of a member on a date (approved only unless `includePending`). */
export function leaveOn(userId: string, date: string, state: TimeOffState = timeOffState(), includePending = false): LeaveDay[] {
  return state.requests
    .filter((r) => r.userId === userId && (r.status === "approved" || (includePending && r.status === "submitted")) && r.start <= date && r.end >= date)
    .flatMap((r) =>
      r.details
        .filter((d) => d.started_at_datetime.startsWith(date))
        .map((d) => ({
          request_id: r.id,
          policy_id: r.policyId,
          policy_name: policyOf(state, r.policyId)?.name ?? r.policyName,
          duration_state: r.leaveType,
          duration_seconds: detailSeconds(d),
          is_paid: policyOf(state, r.policyId)?.paid ?? true,
          status: r.status,
          started_at: d.started_at_datetime,
          stopped_at: d.stopped_at_datetime,
        })),
    );
}

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

/** GET /time-off-policy/list/{org}?limit&offset&search */
export function listPolicies(ctx: Ctx, sp: URLSearchParams): TimeOffPolicyList {
  const state = timeOffState();
  const limit = Math.max(1, Math.min(500, Number(sp.get("limit") ?? 10) || 10));
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const search = (sp.get("search") ?? "").toLowerCase();
  const rows = ctx.scenario === "empty" ? [] : state.policies.filter((p) => !search || p.name.toLowerCase().includes(search)).sort((a, b) => b.createdAt - a.createdAt);
  const data = rows.slice(offset, offset + limit).map((p) => serializePolicy(state, p));
  return { total: rows.length, limit, offset, data, items: data };
}

/** GET /time-off/policies-list/{org} and /time-off-policy/view-all/{org} — every policy (filters, pickers). */
export function allPolicies(ctx: Ctx) {
  const state = timeOffState();
  const data = ctx.scenario === "empty" ? [] : state.policies.map((p) => serializePolicy(state, p));
  return { total: data.length, data };
}

export function policyDetail(id: number): TimeOffPolicyDetail {
  const state = timeOffState();
  const p = policyOf(state, id);
  if (!p) throw new ApiError(404, "Time off policy not found");
  return {
    ...serializePolicy(state, p),
    assigned_users: MEMBERS.filter((m) => state.assignments.get(m.user_id)?.some((a) => a.policyId === id)).map((m) => ({ user_id: m.user_id, full_name: m.full_name, email: m.email })),
  };
}

/** GET /user-time-off-policy/list/{org} — policies assigned to the logged-in user (the "+ Time off" policy select). */
export function userPolicies(ctx: Ctx, userId = DEMO_USER_ID): { total: number; data: UserTimeOffPolicy[] } {
  const state = timeOffState();
  const list = ctx.scenario === "empty" ? [] : (state.assignments.get(userId) ?? []);
  const data = list
    .map((a) => ({ a, p: policyOf(state, a.policyId) }))
    .filter((x): x is { a: { policyId: number; assignedAt: number }; p: PolicyRec } => !!x.p)
    .map(({ a, p }) => ({
      id: p.id,
      name: p.name,
      policy_type: p.policy_type,
      accrual_year_anchor: p.accrual_year_anchor,
      auto_add_new_users: p.auto_add_new_users,
      allow_negative_balances: p.allow_negative_balances,
      max_negative_balance: p.max_negative_balance,
      requires_approval: p.requires_approval,
      paid: p.paid,
      users_count: usersCount(state, p.id),
      assigned_at: naive(a.assignedAt),
      created_at: naive(p.createdAt),
      updated_at: p.updatedAt > p.createdAt ? naive(p.updatedAt) : null,
      tenure_accrual_enabled: p.tenure_accrual_enabled,
      tenure_tiers: p.tenure_tiers,
      tenure_increase_hours: p.tenure_increase_hours,
      tenure_increase_interval_years: p.tenure_increase_interval_years,
      tenure_max_annual_hours: p.tenure_max_annual_hours,
      rollover_cap: p.rollover_cap,
      rollover_expiry_days: p.rollover_expiry_days,
    }));
  return { total: data.length, data };
}

const POLICY_TYPES = ["none", "annual", "monthly", "hours_worked", "joined_date"] as const;
const ANCHORS = ["calendar_year", "work_anniversary", "policy_joined_date"] as const;

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function validatePolicy(body: Record<string, unknown>, isEdit: boolean) {
  const errors: string[] = [];
  if (!String(body.name ?? "").trim()) errors.push("Policy name is required");
  if (!isEdit && body.policy_type === "none" && (body.starting_balance === "" || body.starting_balance === null || body.starting_balance === undefined)) errors.push("Starting balance is required");
  if (num(body.starting_balance) < 0) errors.push("Starting balance cannot be negative");
  if (!num(body.client_id)) errors.push("Client is required");
  if (errors.length) throw new ApiError(400, errors.join(", "));
}

function setAssignments(state: TimeOffState, policyId: number, userIds: string[]) {
  const now = Date.now();
  for (const m of MEMBERS) {
    const list = state.assignments.get(m.user_id) ?? [];
    const has = list.some((a) => a.policyId === policyId);
    if (userIds.includes(m.user_id) && !has) list.push({ policyId, assignedAt: now });
    if (!userIds.includes(m.user_id) && has) list.splice(list.findIndex((a) => a.policyId === policyId), 1);
    state.assignments.set(m.user_id, list);
  }
}

/** POST /time-off-policy/create/{org} */
export function createPolicy(body: Record<string, unknown>): TimeOffPolicy {
  const state = timeOffState();
  validatePolicy(body, false);
  const type = (POLICY_TYPES as readonly string[]).includes(String(body.policy_type)) ? (body.policy_type as PolicyRec["policy_type"]) : "none";
  const now = Date.now();
  const id = Math.max(200, ...state.policies.map((p) => p.id)) + 1;
  const paid = body.is_paid !== undefined ? !!body.is_paid : body.paid !== false;
  const rec: PolicyRec = {
    id,
    name: String(body.name).trim(),
    policy_type: type,
    accrual_year_anchor: type === "none" ? "calendar_year" : (ANCHORS as readonly string[]).includes(String(body.accrual_year_anchor)) ? (body.accrual_year_anchor as PolicyRec["accrual_year_anchor"]) : "calendar_year",
    auto_add_new_users: !!body.auto_add_new_users,
    allow_negative_balances: !!body.allow_negative_balances,
    max_negative_balance: body.allow_negative_balances ? num(body.max_negative_balance) : 0,
    balance_rolls_over_annually: !!body.balance_rolls_over_annually,
    requires_approval: !!body.requires_approval,
    paid,
    is_paid: paid,
    client_id: num(body.client_id),
    is_billable: paid && !!body.is_billable,
    hours_per_year: num(body.hours_per_year),
    starting_balance: num(body.starting_balance),
    accrual_per_month: num(body.accrual_per_month),
    accrual_day: (["first_day_of_month", "last_day_of_month", "monthly_anniversary"].includes(String(body.accrual_day)) ? body.accrual_day : "first_day_of_month") as PolicyRec["accrual_day"],
    allow_prorated: !!body.allow_prorated,
    hours_worked_accrued: num(body.hours_worked_accrued),
    hours_worked_per_worked: num(body.hours_worked_per_worked),
    tenure_accrual_enabled: !!body.tenure_accrual_enabled,
    tenure_tiers: Array.isArray(body.tenure_tiers) ? (body.tenure_tiers as PolicyRec["tenure_tiers"]) : [],
    tenure_increase_hours: num(body.tenure_increase_hours),
    tenure_increase_interval_years: num(body.tenure_increase_interval_years),
    tenure_max_annual_hours: body.tenure_max_annual_hours == null ? null : num(body.tenure_max_annual_hours),
    rollover_cap: body.balance_rolls_over_annually ? (body.rollover_cap == null ? null : num(body.rollover_cap)) : 0,
    rollover_expiry_days: body.rollover_expiry_days == null ? null : num(body.rollover_expiry_days),
    createdAt: now,
    updatedAt: now,
  };
  state.policies.push(rec);
  setAssignments(state, id, Array.isArray(body.user_ids) ? body.user_ids.map(String) : []);
  return serializePolicy(state, rec);
}

/** PUT /time-off-policy/update/{org}/{id} — schedule of accrual and accrual year are locked after creation. */
export function updatePolicy(id: number, body: Record<string, unknown>): TimeOffPolicy {
  const state = timeOffState();
  const p = policyOf(state, id);
  if (!p) throw new ApiError(404, "Time off policy not found");
  validatePolicy(body, true);
  const paid = body.is_paid !== undefined ? !!body.is_paid : p.paid;
  p.name = String(body.name).trim();
  p.client_id = num(body.client_id);
  p.paid = paid;
  p.is_paid = paid;
  p.is_billable = paid && (body.is_billable !== undefined ? !!body.is_billable : p.is_billable);
  p.requires_approval = body.requires_approval !== undefined ? !!body.requires_approval : p.requires_approval;
  p.allow_negative_balances = body.allow_negative_balances !== undefined ? !!body.allow_negative_balances : p.allow_negative_balances;
  p.max_negative_balance = p.allow_negative_balances ? num(body.max_negative_balance, p.max_negative_balance) : 0;
  p.balance_rolls_over_annually = body.balance_rolls_over_annually !== undefined ? !!body.balance_rolls_over_annually : p.balance_rolls_over_annually;
  p.rollover_cap = p.balance_rolls_over_annually ? (body.rollover_cap == null ? null : num(body.rollover_cap)) : 0;
  p.rollover_expiry_days = body.rollover_expiry_days == null ? null : num(body.rollover_expiry_days);
  if (p.policy_type === "none" && body.starting_balance !== undefined) p.starting_balance = num(body.starting_balance);
  if (body.hours_per_year !== undefined && p.policy_type !== "none" && p.policy_type !== "monthly") p.hours_per_year = num(body.hours_per_year);
  if (p.policy_type === "monthly" && body.accrual_per_month !== undefined) p.accrual_per_month = num(body.accrual_per_month);
  if (body.accrual_day) p.accrual_day = body.accrual_day as PolicyRec["accrual_day"];
  if (p.policy_type === "hours_worked") {
    if (body.hours_worked_accrued !== undefined) p.hours_worked_accrued = num(body.hours_worked_accrued);
    if (body.hours_worked_per_worked !== undefined) p.hours_worked_per_worked = num(body.hours_worked_per_worked);
  }
  p.auto_add_new_users = body.auto_add_new_users !== undefined ? !!body.auto_add_new_users : p.auto_add_new_users;
  p.updatedAt = Date.now();
  if (Array.isArray(body.user_ids)) setAssignments(state, id, body.user_ids.map(String));
  return serializePolicy(state, p);
}

/** DELETE /time-off-policy/delete/{org}/{id} */
export function deletePolicy(id: number) {
  const state = timeOffState();
  if (!policyOf(state, id)) throw new ApiError(404, "Time off policy not found");
  state.policies = state.policies.filter((p) => p.id !== id);
  for (const list of state.assignments.values()) {
    const i = list.findIndex((a) => a.policyId === id);
    if (i >= 0) list.splice(i, 1);
  }
  return { status: "success", message: "Time off policy deleted successfully", id };
}

export const allClients = (ctx: Ctx) => (ctx.scenario === "empty" ? [] : CLIENTS.map((c) => ({ ...c })));

/* ------------------------------------------------------------------ */
/* Balances & audit trail                                              */
/* ------------------------------------------------------------------ */

function memberClients(userId: string) {
  const m = memberOf(userId)!;
  const names = [...new Set(PROJECTS.filter((p) => m.projects.includes(p.id) && p.client).map((p) => p.client as string))];
  return names.map((n) => CLIENTS.find((c) => c.name === n)!).filter(Boolean);
}

export function balanceRow(state: TimeOffState, store: MockStore, userId: string): BalanceRow {
  const m = memberOf(userId)!;
  return {
    user_id: m.user_id,
    full_name: m.full_name,
    email: m.email,
    profile_image_url: m.profile_image_url,
    clients: memberClients(userId),
    projects: PROJECTS.filter((p) => m.projects.includes(p.id)).map((p) => ({ id: p.id, name: p.name })),
    teams: TEAMS.filter((t) => m.teams.includes(t.id)),
    policies: (state.assignments.get(userId) ?? [])
      .map((a) => policyOf(state, a.policyId))
      .filter((p): p is PolicyRec => !!p)
      .map((p) => ({
        policy_id: p.id,
        policy_name: p.name,
        is_billable: p.is_billable,
        is_paid: p.paid,
        allow_negative_balances: p.allow_negative_balances,
        balance_hours: currentBalance(state, store, userId, p.id),
        accrued_hours: round2(accruedHours(state, store, userId, p.id) + adjustmentTotal(state, userId, p.id)),
        used_hours: usedHours(state, userId, p.id, "approved"),
        pending_hours: usedHours(state, userId, p.id, "submitted"),
      })),
  };
}

/** GET /time-off-balances/{org}?limit&offset&search */
export function listBalances(ctx: Ctx, sp: URLSearchParams): BalancesResponse {
  const state = timeOffState();
  const store = getStore();
  const limit = Math.max(1, Math.min(500, Number(sp.get("limit") ?? 10) || 10));
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const search = (sp.get("search") ?? "").toLowerCase();
  const policies = listParam(sp, "time_off_policy_id").map(Number);
  const teams = listParam(sp, "team_id").map(Number);
  const members =
    ctx.scenario === "empty"
      ? []
      : [...MEMBERS]
          .filter((m) => !search || m.full_name.toLowerCase().includes(search) || m.email.toLowerCase().includes(search))
          .filter((m) => !policies.length || state.assignments.get(m.user_id)?.some((a) => policies.includes(a.policyId)))
          .filter((m) => !teams.length || m.teams.some((t) => teams.includes(t)))
          .sort((a, b) => a.full_name.localeCompare(b.full_name));
  return { total: members.length, limit, offset, items: members.slice(offset, offset + limit).map((m) => balanceRow(state, store, m.user_id)) };
}

/** GET /time-off-balances/{org}/export — CSV of every member × policy balance. */
export function exportBalancesCsv(ctx: Ctx) {
  const state = timeOffState();
  const store = getStore();
  const lines = ["Member,Email,Policy,Billable,Paid,Accrued (hrs),Used (hrs),Pending (hrs),Balance (hrs)"];
  if (ctx.scenario !== "empty")
    for (const m of [...MEMBERS].sort((a, b) => a.full_name.localeCompare(b.full_name)))
      for (const p of balanceRow(state, store, m.user_id).policies)
        lines.push([m.full_name, m.email, p.policy_name, p.is_billable ? "Yes" : "No", p.is_paid ? "Yes" : "No", p.accrued_hours, p.used_hours, p.pending_hours, p.balance_hours].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  return lines.join("\n") + "\n";
}

/** PUT /time-off-balances/{org}/{policy}/members/{user} — body { new_balance_hours, reason }: sets a new balance (logged adjustment). */
export function adjustBalance(policyId: number, userId: string, body: Record<string, unknown>, byUserId = DEMO_USER_ID) {
  const state = timeOffState();
  const store = getStore();
  if (!memberOf(userId)) throw new ApiError(404, "Member not found");
  if (!policyOf(state, policyId) || !state.assignments.get(userId)?.some((a) => a.policyId === policyId)) throw new ApiError(404, "Time off policy not found");
  const raw = body.new_balance_hours ?? body.balance_hours;
  const target = Number(raw);
  if (raw === undefined || raw === null || raw === "" || !Number.isFinite(target)) throw new ApiError(400, "New balance is required");
  const reason = String(body.reason ?? "").trim();
  if (!reason) throw new ApiError(400, "Reason is required");
  const before = currentBalance(state, store, userId, policyId);
  const delta = round2(target - before);
  if (delta === 0) throw new ApiError(400, "This matches the current balance — change the value to save an adjustment.");
  const adj: AdjustmentRec = { id: ++state.seq, userId, policyId, delta, from: before, to: round2(target), reason, byUserId, at: Date.now() };
  state.adjustments.push(adj);
  return { status: "success", message: "Balance adjusted successfully", adjustment: { id: adj.id, adjustment_hours: delta, from_hours: before, to_hours: adj.to, reason }, balance: balanceRow(state, store, userId).policies.find((p) => p.policy_id === policyId) };
}

/** POST /time-off-balances/{org}/batch-adjust — body { items: [{ user_id, policy_id, new_balance_hours }], reason }. */
export function batchAdjust(body: Record<string, unknown>) {
  const items = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  if (!items.length) throw new ApiError(400, "No balances selected");
  const results = items.map((it) => adjustBalance(Number(it.policy_id), String(it.user_id), { new_balance_hours: it.new_balance_hours, reason: it.reason ?? body.reason }));
  return { status: "success", count: results.length };
}

/** GET /time-off-audit-trail/{org}?start_date&end_date&limit&offset&search — members with adjustments in the range. */
export function auditTrail(ctx: Ctx, sp: URLSearchParams): AuditTrailResponse {
  const state = timeOffState();
  const store = getStore();
  const today = dayjs(todayOrg());
  const start = sp.get("start_date") || today.subtract(6, "day").format("YYYY-MM-DD");
  const end = sp.get("end_date") || today.format("YYYY-MM-DD");
  const limit = Math.max(1, Math.min(500, Number(sp.get("limit") ?? 10) || 10));
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  const search = (sp.get("search") ?? "").toLowerCase();
  const inRange = (a: AdjustmentRec) => {
    const d = localDate(a.at, ORG_TZ);
    return d >= start && d <= end;
  };
  const rows: AuditRow[] = [];
  if (ctx.scenario !== "empty")
    for (const m of MEMBERS) {
      const adjs = state.adjustments.filter((a) => a.userId === m.user_id && inRange(a));
      if (!adjs.length) continue;
      if (search && !m.full_name.toLowerCase().includes(search) && !m.email.toLowerCase().includes(search)) continue;
      const bal = balanceRow(state, store, m.user_id).policies;
      const withAdj = bal.filter((p) => adjs.some((a) => a.policyId === p.policy_id));
      const accrued = round2(bal.reduce((s, p) => s + p.accrued_hours, 0));
      const used = round2(bal.reduce((s, p) => s + p.used_hours, 0));
      rows.push({
        user_id: m.user_id,
        full_name: m.full_name,
        email: m.email,
        profile_image_url: m.profile_image_url,
        policy_count: bal.length,
        policy_label: bal.length === 1 ? bal[0].policy_name : `${bal.length} policies`,
        total_accrued_hours: accrued,
        total_used_hours: used,
        balance_remaining_hours: round2(accrued - used),
        last_adjusted: naive(Math.max(...adjs.map((a) => a.at))),
        policies: withAdj.map((p) => ({
          policy_id: p.policy_id,
          policy_name: p.policy_name,
          accrued_hours: p.accrued_hours,
          used_hours: p.used_hours,
          remaining_hours: p.balance_hours,
          adjustments: adjs
            .filter((a) => a.policyId === p.policy_id)
            .sort((a, b) => b.at - a.at)
            .map((a) => {
              const by = memberOf(a.byUserId)!;
              return { id: a.id, adjustment_hours: a.delta, from_hours: a.from, to_hours: a.to, reason: a.reason, adjusted_by: { user_id: by.user_id, full_name: by.full_name, profile_image_url: by.profile_image_url }, adjusted_on: naive(a.at) };
            }),
        })),
      });
    }
  rows.sort((a, b) => a.full_name.localeCompare(b.full_name));
  return { total: rows.length, limit, offset, start_date: start, end_date: end, items: rows.slice(offset, offset + limit) };
}

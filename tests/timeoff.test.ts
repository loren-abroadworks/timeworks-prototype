/**
 * Contract tests for batch 2: Calendar › Timeoff Requests, Absence & Leave (calendar, requests, balances,
 * audit trail, policies) and Calendar › Schedules. Shapes follow the live "QUERY SHAPES" where captured
 * (requests, month / week view, balance summary, policies, user policies, clients, shift report, shift rule overview);
 * Balances and Audit Trail use the replica's own shapes (not captured live).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import dayjs from "dayjs";
import { shapeErrors, type Shape } from "./shape";
import { resetStore } from "@/mock/store";
import { GET as requests } from "@/app/api/v1/time-off/requests/[org]/route";
import { POST as createReq } from "@/app/api/v1/time-off/request/[org]/route";
import { PUT as updateReq, DELETE as deleteReq } from "@/app/api/v1/time-off/request/[org]/[id]/route";
import { POST as summary } from "@/app/api/v1/time-off/request/balance-summary/[org]/route";
import { GET as monthView } from "@/app/api/v1/time-off-request/month-view/[org]/route";
import { GET as weekView } from "@/app/api/v1/time-off-request/week-view/[org]/route";
import { PATCH as statusUpdate } from "@/app/api/v1/status-update/time-off/[org]/[id]/route";
import { GET as userPolicies } from "@/app/api/v1/user-time-off-policy/list/[org]/route";
import { GET as policyList } from "@/app/api/v1/time-off-policy/list/[org]/route";
import { GET as policyDetail } from "@/app/api/v1/time-off-policy/[org]/[id]/route";
import { POST as policyCreate } from "@/app/api/v1/time-off-policy/create/[org]/route";
import { PUT as policyUpdate } from "@/app/api/v1/time-off-policy/update/[org]/[id]/route";
import { DELETE as policyDelete } from "@/app/api/v1/time-off-policy/delete/[org]/[id]/route";
import { GET as balances } from "@/app/api/v1/time-off-balances/[org]/route";
import { GET as balancesExport } from "@/app/api/v1/time-off-balances/[org]/export/route";
import { PUT as adjust } from "@/app/api/v1/time-off-balances/[org]/[policy]/members/[user]/route";
import { GET as audit } from "@/app/api/v1/time-off-audit-trail/[org]/route";
import { GET as clients } from "@/app/api/v1/all/clients/[org]/route";
import { GET as shiftReport } from "@/app/api/v1/shift-report/[org]/route";
import { POST as shiftCreate } from "@/app/api/v1/shift-create/[org]/route";
import { PUT as shiftUpdate } from "@/app/api/v1/shift-update/[org]/[user]/route";
import { DELETE as shiftDelete } from "@/app/api/v1/shift-delete/[org]/route";
import { GET as ruleOverview } from "@/app/api/v1/user/shift-rule-overview/[org]/[user]/route";
import { GET as timesheet } from "@/app/api/v1/reports/user-time-sheet/[org]/[user]/route";
import { GET as screenshots } from "@/app/api/v1/activity-screenshots/[org]/route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type H = (req: NextRequest, ctx: any) => Promise<Response>;
async function call(h: H, path: string, init: { method?: string; body?: unknown; params?: Record<string, string> } = {}) {
  const req = new NextRequest(new URL(`http://localhost${path}${path.includes("?") ? "&" : "?"}latency=0`), {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: init.body === undefined ? undefined : { "content-type": "application/json" },
  });
  const res = await h(req, { params: Promise.resolve({ org: "3", ...(init.params ?? {}) }) });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* CSV */
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: res.status, body: body as any };
}
const ok = (v: unknown, s: Shape) => expect(shapeErrors(v, s)).toEqual([]);

const OWNER = "0f9c2a71-5b3e-7d41-9a6c-2e8b4d1f7a30";
const PRIYA = "1b7e4c22-8d90-7a13-b5f2-6c0d9e3a1f44";
const AISHA = "5fbc8066-c1d4-7e57-b9d6-a041d27e5d88";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const monthStart = () => dayjs(today()).startOf("month");

const DETAIL: Shape = { id: "number", started_at_datetime: "string", stopped_at_datetime: "string" };
const ATTACHMENT: Shape = { id: "number", file_name: "string", file_size: "number", content_type: "string", url: "string" };
const REQUEST: Shape = {
  id: "number",
  user_id: "string",
  user_name: "string",
  user_email: "string",
  profile_image_url: "string|null",
  started_at_date: "date",
  stopped_at_date: "date",
  notes: "string",
  reason_notes: "string|null",
  leave_type: "string",
  time_off_policy_id: "number",
  policy_name: "string",
  status: "string",
  approved_by: "string|null",
  timezone: "string",
  created_at: "string",
  updated_at: "string",
  details: [DETAIL],
  attachments: [ATTACHMENT],
};
const VIEW_COMMON: Record<string, Shape> = {
  status: "string",
  leave_type: "string",
  time_off_policy_id: "number",
  policy_name: "string",
  started_at_date: "date",
  stopped_at_date: "date",
  is_start: "boolean",
  is_end: "boolean",
  duration_seconds: "number|null",
  details: [DETAIL],
  notes: "string",
  reason_notes: "string|null",
  approved_by: "string|null",
  timezone: "string",
  created_at: "string",
  updated_at: "string",
  attachment_count: "number",
  attachments: [ATTACHMENT],
};
const MONTH_ENTRY: Shape = { id: "number", user_id: "string", user_name: "string", user_email: "string", profile_image_url: "string|null", ...VIEW_COMMON };
const WEEK_LEAVE: Shape = { id: "number", bar_start: "boolean", visible_span_days: "number", continues_before: "boolean", continues_after: "boolean", ...VIEW_COMMON };
const POLICY: Shape = {
  id: "number",
  name: "string",
  policy_type: "string",
  accrual_year_anchor: "string",
  auto_add_new_users: "boolean",
  allow_negative_balances: "boolean",
  max_negative_balance: "number",
  balance_rolls_over_annually: "boolean",
  requires_approval: "boolean",
  paid: "boolean",
  is_paid: "boolean",
  client_id: "number",
  client_name: "string",
  is_billable: "boolean",
  hours_per_year: "number",
  starting_balance: "number",
  accrual_per_month: "number",
  accrual_day: "string",
  allow_prorated: "boolean",
  hours_worked_accrued: "number",
  hours_worked_per_worked: "number",
  users_count: "number",
  created_at: "string",
  updated_at: "string",
  tenure_accrual_enabled: "boolean",
  tenure_tiers: [{ from_year: "number", annual_hours: "number" }],
  tenure_increase_hours: "number",
  tenure_increase_interval_years: "number",
  tenure_max_annual_hours: "number|null",
  rollover_cap: "number|null",
  rollover_expiry_days: "number|null",
};
const SUMMARY: Shape = {
  user_id: "string",
  member_name: "string",
  policy_id: "number",
  policy_name: "string",
  year: "number",
  current_balance_in_second: "number",
  this_request_in_second: "number",
  pending_requests_in_second: "number",
  remaining_balance_in_second: "number",
  current_balance_hours: "number",
  this_request_hours: "number",
  pending_requests_hours: "number",
  remaining_balance_hours: "number",
  carryover_remaining_in_second: "number|null",
  carryover_remaining_hours: "number|null",
  carryover_expires_at: "string|null",
};

/** First weekday ≥ `from` days ahead with no leave for the owner (keeps tests independent of the seed calendar). */
async function freeOwnerDay(from = 40) {
  const { body } = await call(requests, `/api/v1/time-off/requests/3?limit=1000&filter_user_id=${OWNER}`);
  const taken = (body.items as { started_at_date: string; stopped_at_date: string; status: string }[]).filter((r) => r.status !== "denied");
  for (let d = dayjs(today()).add(from, "day"); ; d = d.add(1, "day")) {
    const s = d.format("YYYY-MM-DD");
    if (d.day() === 0 || d.day() === 6) continue;
    if (!taken.some((r) => r.started_at_date <= s && r.stopped_at_date >= s)) return s;
  }
}

beforeEach(() => {
  resetStore();
});

describe("time off requests", () => {
  it("list matches the live shape with status counts", async () => {
    const start = monthStart().subtract(2, "month").format("YYYY-MM-DD");
    const end = monthStart().add(3, "month").format("YYYY-MM-DD");
    const { status, body } = await call(requests, `/api/v1/time-off/requests/3?limit=25&offset=0&start_date=${start}&end_date=${end}&timezone=America/New_York`);
    expect(status).toBe(200);
    ok(body, {
      total: "number",
      current_month_total: "number",
      status_counts: { submitted: "number", approved: "number", denied: "number" },
      limit: "number",
      offset: "number",
      timezone: "string",
      current_month: { start_date: "date", end_date: "date" },
      items: [REQUEST],
    });
    expect(body.total).toBeGreaterThanOrEqual(30);
    expect(body.status_counts.submitted).toBeGreaterThan(0);
    expect(body.status_counts.denied).toBeGreaterThan(0);
    const pending = await call(requests, `/api/v1/time-off/requests/3?status=submitted&start_date=${start}&end_date=${end}`);
    expect(pending.body.items.every((r: { status: string }) => r.status === "submitted")).toBe(true);
    expect(pending.body.total).toBe(body.status_counts.submitted);
  });

  it("month view has a day with 4+ leaves and the week view stacks one row per member", async () => {
    const s = monthStart();
    const { body } = await call(monthView, `/api/v1/time-off-request/month-view/3?start_date=${s.format("YYYY-MM-DD")}&end_date=${s.endOf("month").format("YYYY-MM-DD")}`);
    ok(body, { timezone: "string", range: { start_date: "date", end_date: "date" }, truncated: "boolean", data: "any" });
    const days = Object.values(body.data as Record<string, unknown[]>);
    expect(days.length).toBe(s.daysInMonth());
    for (const list of days) for (const e of list) ok(e, MONTH_ENTRY);
    expect(Math.max(...days.map((l) => l.filter((e) => (e as { status: string }).status !== "denied").length))).toBeGreaterThanOrEqual(4);

    const wk = await call(weekView, `/api/v1/time-off-request/week-view/3?start_date=${s.format("YYYY-MM-DD")}&end_date=${s.endOf("month").format("YYYY-MM-DD")}&limit=200`);
    ok(wk.body, {
      view: "string",
      range: { start_date: "date", end_date: "date" },
      days: ["date"],
      timezone: "string",
      total: "number",
      limit: "number",
      offset: "number",
      truncated: "boolean",
      items: [{ user_id: "string", full_name: "string", email: "string", profile_image_url: "string|null", timezone: "string", teams: [{ id: "number", name: "string" }], leaves: "any" }],
    });
    for (const m of wk.body.items) for (const list of Object.values(m.leaves as Record<string, unknown[]>)) for (const l of list) ok(l, WEEK_LEAVE);
    expect(wk.body.items.length).toBeGreaterThanOrEqual(4);
  });

  it("create → overlap rejected (also partial) → approve → balance deducted → deny → delete", async () => {
    const date = await freeOwnerDay();
    const policies = await call(userPolicies, "/api/v1/user-time-off-policy/list/3");
    ok(policies.body, {
      total: "number",
      data: [
        {
          id: "number",
          name: "string",
          policy_type: "string",
          accrual_year_anchor: "string",
          auto_add_new_users: "boolean",
          allow_negative_balances: "boolean",
          max_negative_balance: "number",
          requires_approval: "boolean",
          paid: "boolean",
          users_count: "number",
          assigned_at: "string",
          created_at: "string",
          updated_at: "string|null",
          tenure_accrual_enabled: "boolean",
          tenure_tiers: [{ from_year: "number", annual_hours: "number" }],
          tenure_increase_hours: "number",
          tenure_increase_interval_years: "number",
          tenure_max_annual_hours: "number|null",
          rollover_cap: "number|null",
          rollover_expiry_days: "number|null",
        },
      ],
    });
    const needsApproval = policies.body.data.find((p: { requires_approval: boolean }) => p.requires_approval);
    const auto = policies.body.data.find((p: { requires_approval: boolean }) => !p.requires_approval);
    const data = {
      started_at_date: date,
      stopped_at_date: date,
      notes: "Contract test leave",
      leave_type: "full_day",
      status: "submitted",
      timezone: "America/New_York",
      time_off_policy_id: needsApproval.id,
      details: [{ started_at_datetime: `${date}T09:00:00`, stopped_at_datetime: `${date}T17:00:00` }],
    };
    const created = await call(createReq, "/api/v1/time-off/request/3", { method: "POST", body: { data: JSON.stringify(data) } });
    expect(created.status).toBe(200);
    ok(created.body, REQUEST);
    expect(created.body.status).toBe("submitted");
    expect(created.body.user_id).toBe(OWNER);

    // One leave per member per date — full day and partial both rejected.
    const again = await call(createReq, "/api/v1/time-off/request/3", { method: "POST", body: { data: JSON.stringify({ ...data, time_off_policy_id: auto.id }) } });
    expect(again.status).toBe(400);
    expect(again.body.message).toBe(`Date range overlaps with an existing request (${date} → ${date})`);
    const partial = await call(createReq, "/api/v1/time-off/request/3", {
      method: "POST",
      body: { ...data, leave_type: "partial", details: [{ started_at_datetime: `${date}T18:00:00`, stopped_at_datetime: `${date}T19:00:00` }] },
    });
    expect(partial.status).toBe(400);
    expect(partial.body.message).toContain("Date range overlaps with an existing request");

    // Balance summary: this request + pending.
    const sum = await call(summary, "/api/v1/time-off/request/balance-summary/3", {
      method: "POST",
      body: { user_id: OWNER, time_off_policy_id: needsApproval.id, timezone: "America/New_York", details: data.details, exclude_request_id: created.body.id },
    });
    ok(sum.body, SUMMARY);
    expect(sum.body.this_request_hours).toBe(8);
    const before = sum.body.current_balance_hours;

    // Edit while pending.
    const edited = await call(updateReq, `/api/v1/time-off/request/3/${created.body.id}`, { method: "PUT", body: { data: JSON.stringify({ ...data, notes: "Edited note" }) }, params: { id: String(created.body.id) } });
    expect(edited.status).toBe(200);
    expect(edited.body.notes).toBe("Edited note");

    // Approve → balance deducted.
    const approved = await call(statusUpdate, `/api/v1/status-update/time-off/3/${created.body.id}`, { method: "PATCH", body: { status: "approved", reason_notes: "", timezone: "America/New_York" }, params: { id: String(created.body.id) } });
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe("approved");
    expect(approved.body.approved_by).toBe("Jordan Avery");
    const bal = await call(balances, "/api/v1/time-off-balances/3?limit=50");
    const ownerPolicy = bal.body.items.find((r: { user_id: string }) => r.user_id === OWNER).policies.find((p: { policy_id: number }) => p.policy_id === needsApproval.id);
    expect(ownerPolicy.balance_hours).toBeCloseTo(before - 8, 2);

    // Deny needs a reason.
    const noReason = await call(statusUpdate, `/api/v1/status-update/time-off/3/${created.body.id}`, { method: "PATCH", body: { status: "denied", reason_notes: " " }, params: { id: String(created.body.id) } });
    expect(noReason.status).toBe(400);
    const denied = await call(statusUpdate, `/api/v1/status-update/time-off/3/${created.body.id}`, { method: "PATCH", body: { status: "denied", reason_notes: "Coverage" }, params: { id: String(created.body.id) } });
    expect(denied.body.status).toBe("denied");
    expect(denied.body.reason_notes).toBe("Coverage");

    // Delete (reason required).
    const noNotes = await call(deleteReq, `/api/v1/time-off/request/3/${created.body.id}`, { method: "DELETE", body: { timezone: "America/New_York" }, params: { id: String(created.body.id) } });
    expect(noNotes.status).toBe(400);
    const del = await call(deleteReq, `/api/v1/time-off/request/3/${created.body.id}`, { method: "DELETE", body: { timezone: "America/New_York", deleted_notes: "Plans changed" }, params: { id: String(created.body.id) } });
    expect(del.status).toBe(200);
    const list = await call(requests, `/api/v1/time-off/requests/3?limit=1000&start_date=${date}&end_date=${date}&filter_user_id=${OWNER}`);
    expect(list.body.items.some((r: { id: number }) => r.id === created.body.id)).toBe(false);
  });

  it("auto-approve policies create Approved requests that show on Timesheets", async () => {
    const date = await freeOwnerDay(45);
    const policies = await call(userPolicies, "/api/v1/user-time-off-policy/list/3");
    const auto = policies.body.data.find((p: { requires_approval: boolean; name: string }) => !p.requires_approval);
    const created = await call(createReq, "/api/v1/time-off/request/3", {
      method: "POST",
      body: { started_at_date: date, stopped_at_date: date, notes: "Auto", leave_type: "full_day", status: "submitted", timezone: "America/New_York", time_off_policy_id: auto.id, details: [{ started_at_datetime: `${date}T09:00:00`, stopped_at_datetime: `${date}T17:00:00` }] },
    });
    expect(created.body.status).toBe("approved");
    const ts = await call(timesheet, `/api/v1/reports/user-time-sheet/3/${OWNER}?start_date=${date}&end_date=${date}&timezone_str=America/New_York&offset=0&limit=31`, { params: { user: OWNER } });
    const day = ts.body.report[date];
    expect(day.time_off[0].policy_name).toBe(auto.name);
    expect(day.day_time_off_seconds).toBe(8 * 3600);
  });

  it("approved leave feeds the Screenshots leave banner", async () => {
    const s = monthStart();
    const { body } = await call(monthView, `/api/v1/time-off-request/month-view/3?start_date=${s.subtract(1, "month").format("YYYY-MM-DD")}&end_date=${dayjs(today()).subtract(1, "day").format("YYYY-MM-DD")}&status=approved`);
    const [date, list] = Object.entries(body.data as Record<string, { user_id: string; leave_type: string }[]>).find(([d, l]) => l.some((e) => e.leave_type === "full_day") && ![0, 6].includes(dayjs(d).day()))!;
    const e = list.find((x) => x.leave_type === "full_day")!;
    const shots = await call(screenshots, `/api/v1/activity-screenshots/3?activity_date=${date}&timezone=America/New_York&view_mode=every_ten_minutes&user_id=${e.user_id}`);
    expect(shots.body.has_time_off).toBe(true);
    expect(shots.body.time_off[0]).toMatchObject({ duration_state: "full_day" });
  });
});

describe("policies", () => {
  it("list / detail / create (validation) / edit (schedule locked) / delete", async () => {
    const list = await call(policyList, "/api/v1/time-off-policy/list/3?limit=10&offset=0");
    ok(list.body, { total: "number", limit: "number", offset: "number", data: [POLICY], items: [POLICY] });
    expect(list.body.total).toBeGreaterThanOrEqual(12);
    const cl = await call(clients, "/api/v1/all/clients/3");
    ok(cl.body, [{ id: "number", name: "string" }]);

    const invalid = await call(policyCreate, "/api/v1/time-off-policy/create/3", { method: "POST", body: { name: "", policy_type: "none", starting_balance: "", client_id: 0 } });
    expect(invalid.status).toBe(400);
    expect(invalid.body.message).toBe("Policy name is required, Starting balance is required, Client is required");

    const created = await call(policyCreate, "/api/v1/time-off-policy/create/3", {
      method: "POST",
      body: { name: "Contract Test Leave", policy_type: "monthly", accrual_year_anchor: "work_anniversary", accrual_per_month: 3, client_id: 12, is_paid: true, paid: true, is_billable: true, requires_approval: true, user_ids: [OWNER, PRIYA], balance_rolls_over_annually: true, rollover_cap: 20, rollover_expiry_days: 30 },
    });
    expect(created.status).toBe(200);
    ok(created.body, POLICY);
    expect(created.body.users_count).toBe(2);
    expect(created.body.client_name).toBe("Bluepeak Health");
    const first = await call(policyList, "/api/v1/time-off-policy/list/3?limit=10&offset=0");
    expect(first.body.items[0].name).toBe("Contract Test Leave");

    const detail = await call(policyDetail, `/api/v1/time-off-policy/3/${created.body.id}`, { params: { id: String(created.body.id) } });
    expect(detail.body.assigned_users.map((u: { user_id: string }) => u.user_id).sort()).toEqual([OWNER, PRIYA].sort());

    const updated = await call(policyUpdate, `/api/v1/time-off-policy/update/3/${created.body.id}`, {
      method: "PUT",
      body: { name: "Contract Test Leave (edited)", policy_type: "annual", accrual_year_anchor: "calendar_year", client_id: 13, is_paid: false, is_billable: true, user_ids: [OWNER] },
      params: { id: String(created.body.id) },
    });
    expect(updated.body.name).toBe("Contract Test Leave (edited)");
    expect(updated.body.policy_type).toBe("monthly"); // locked
    expect(updated.body.accrual_year_anchor).toBe("work_anniversary"); // locked
    expect(updated.body.is_billable).toBe(false); // unpaid → non-billable
    expect(updated.body.users_count).toBe(1);

    const del = await call(policyDelete, `/api/v1/time-off-policy/delete/3/${created.body.id}`, { method: "DELETE", params: { id: String(created.body.id) } });
    expect(del.status).toBe(200);
    const gone = await call(policyDetail, `/api/v1/time-off-policy/3/${created.body.id}`, { params: { id: String(created.body.id) } });
    expect(gone.status).toBe(404);
  });
});

describe("balances and audit trail", () => {
  it("balances list (5+ policy members, billable flags) and CSV export", async () => {
    const { body } = await call(balances, "/api/v1/time-off-balances/3?limit=10&offset=0");
    const PB: Shape = { policy_id: "number", policy_name: "string", is_billable: "boolean", is_paid: "boolean", allow_negative_balances: "boolean", balance_hours: "number", accrued_hours: "number", used_hours: "number", pending_hours: "number" };
    ok(body, {
      total: "number",
      limit: "number",
      offset: "number",
      items: [{ user_id: "string", full_name: "string", email: "string", profile_image_url: "string|null", clients: [{ id: "number", name: "string" }], projects: [{ id: "string", name: "string" }], teams: [{ id: "number", name: "string" }], policies: [PB] }],
    });
    expect(body.items.some((r: { policies: unknown[] }) => r.policies.length >= 5)).toBe(true);
    expect(body.items.flatMap((r: { policies: { is_billable: boolean }[] }) => r.policies).some((p: { is_billable: boolean }) => p.is_billable)).toBe(true);
    const csv = await call(balancesExport, "/api/v1/time-off-balances/3/export");
    expect(String(csv.body)).toMatch(/^Member,Email,Policy/);
  });

  it("adjust a balance → it shows in the audit trail with from / to", async () => {
    const AUDIT_ADJ: Shape = { id: "number", adjustment_hours: "number", from_hours: "number", to_hours: "number", reason: "string", adjusted_by: { user_id: "string", full_name: "string", profile_image_url: "string|null" }, adjusted_on: "string" };
    const AUDIT: Shape = {
      total: "number",
      limit: "number",
      offset: "number",
      start_date: "date",
      end_date: "date",
      items: [
        {
          user_id: "string",
          full_name: "string",
          email: "string",
          profile_image_url: "string|null",
          policy_count: "number",
          policy_label: "string",
          total_accrued_hours: "number",
          total_used_hours: "number",
          balance_remaining_hours: "number",
          last_adjusted: "string",
          policies: [{ policy_id: "number", policy_name: "string", accrued_hours: "number", used_hours: "number", remaining_hours: "number", adjustments: [AUDIT_ADJ] }],
        },
      ],
    };
    const seeded = await call(audit, "/api/v1/time-off-audit-trail/3");
    ok(seeded.body, AUDIT);
    const all = seeded.body.items.flatMap((r: { policies: { adjustments: { adjustment_hours: number }[] }[] }) => r.policies.flatMap((p) => p.adjustments));
    expect(all.some((a: { adjustment_hours: number }) => a.adjustment_hours < 0)).toBe(true);
    expect(all.some((a: { adjustment_hours: number }) => a.adjustment_hours > 0)).toBe(true);

    const bal = await call(balances, "/api/v1/time-off-balances/3?limit=50");
    const liam = bal.body.items.find((r: { full_name: string }) => r.full_name === "Liam Chen");
    const p = liam.policies[0];
    const same = await call(adjust, `/api/v1/time-off-balances/3/${p.policy_id}/members/${liam.user_id}`, { method: "PUT", body: { new_balance_hours: p.balance_hours, reason: "x" }, params: { policy: String(p.policy_id), user: liam.user_id } });
    expect(same.status).toBe(400);
    const noReason = await call(adjust, `/api/v1/time-off-balances/3/${p.policy_id}/members/${liam.user_id}`, { method: "PUT", body: { new_balance_hours: p.balance_hours + 5 }, params: { policy: String(p.policy_id), user: liam.user_id } });
    expect(noReason.status).toBe(400);
    const res = await call(adjust, `/api/v1/time-off-balances/3/${p.policy_id}/members/${liam.user_id}`, {
      method: "PUT",
      body: { new_balance_hours: p.balance_hours - 3, reason: "Contract test correction" },
      params: { policy: String(p.policy_id), user: liam.user_id },
    });
    expect(res.status).toBe(200);
    expect(res.body.adjustment.adjustment_hours).toBe(-3);
    const after = await call(audit, `/api/v1/time-off-audit-trail/3?start_date=${today()}&end_date=${today()}&search=liam`);
    const row = after.body.items[0];
    expect(row.full_name).toBe("Liam Chen");
    const adj = row.policies.find((x: { policy_id: number }) => x.policy_id === p.policy_id).adjustments[0];
    expect(adj).toMatchObject({ adjustment_hours: -3, reason: "Contract test correction", from_hours: p.balance_hours, to_hours: p.balance_hours - 3 });
    expect(adj.adjusted_by.full_name).toBe("Jordan Avery");
  });
});

describe("schedules", () => {
  const DAY_SHAPE: Shape = {
    source: "string|null",
    shift_rule_id: "number|null",
    shift_type: "string|null",
    flexible_type: "string|null",
    scheduled_start: "dur|null",
    scheduled_end: "dur|null",
    start: "dur|null",
    end: "dur|null",
    time_offs: [{ request_id: "number", policy_name: "string", status: "string", leave_type: "string", is_paid: "boolean", started_at: "string", stopped_at: "string" }],
    minimum_hour_interval: "dur",
    shift_buffer_seconds: "number|null",
    shift_buffer_interval: "dur|null",
    is_day_lock: "boolean",
    is_time_lock: "boolean",
    status: "string|null",
    status_tag: "string|null",
  };

  it("shift report (week / day / month) matches the live shape", async () => {
    for (const type of ["Week", "Day", "Month"]) {
      const { body } = await call(shiftReport, `/api/v1/shift-report/3?report_type=${type}&week=${today()}&offset=0&limit=10&search=`);
      ok(body, {
        report_type: "string",
        week_start: "date",
        week_end: "date",
        timezone: "string",
        org_timezone: "string",
        total: "number",
        limit: "number",
        offset: "number",
        items: [{ user_id: "string", full_name: "string", email: "string", profile_image_url: "string|null", timezone: "string", shifts: "any" }],
      });
      for (const m of body.items) for (const d of Object.values(m.shifts)) ok(d, DAY_SHAPE);
      const n = Object.keys(body.items[0].shifts).length;
      expect(type === "Day" ? n === 1 : type === "Week" ? n === 7 : n >= 28).toBe(true);
    }
    const ov = await call(ruleOverview, `/api/v1/user/shift-rule-overview/3/${PRIYA}`, { params: { user: PRIYA } });
    ok(ov.body, { user_id: "string", user_name: "string", shift_rules: [{ shift_name: "string", effective_from: "date", effective_to: "date|null", status: "string", shift_type: "string" }] });
  });

  it("create a shift, edit one day, delete a day", async () => {
    const monday = dayjs(today()).add(7, "day").startOf("week").add(1, "day").format("YYYY-MM-DD");
    const noMembers = await call(shiftCreate, "/api/v1/shift-create/3", { method: "POST", body: { users: [], name: "x", days_of_week: [{ day: 1, start_time: "09:00:00", end_time: "17:00:00" }], effective_from: monday } });
    expect(noMembers.status).toBe(400);
    expect(noMembers.body.message).toBe("Select at least one member");
    const created = await call(shiftCreate, "/api/v1/shift-create/3", {
      method: "POST",
      body: {
        users: [OWNER],
        name: "Contract Morning",
        status: "active",
        shift_type: "fixed",
        minimum_hour: "08:00:00",
        shift_buffer_seconds: 600,
        timezone: "America/New_York",
        days_of_week: [1, 2, 3, 4, 5].map((day) => ({ day, start_time: "07:00:00", end_time: "15:00:00", is_day_lock: false, is_time_lock: false })),
        effective_from: monday,
      },
    });
    expect(created.status).toBe(200);
    const week = await call(shiftReport, `/api/v1/shift-report/3?report_type=Week&week=${monday}&limit=50&search=jordan`);
    const day = week.body.items[0].shifts[monday];
    expect(day).toMatchObject({ source: "shift", start: "07:00:00", end: "15:00:00", status_tag: "upcoming" });

    const edit = await call(shiftUpdate, `/api/v1/shift-update/3/${OWNER}`, {
      method: "PUT",
      body: { source_timezone: "America/New_York", name: "Contract Morning", status: "active", shift_type: "fixed", shift_rule_id: day.shift_rule_id, start_time: "10:00:00", end_time: "18:00:00", shift_date: monday, minimum_hour: "08:00:00", shift_buffer_seconds: 600 },
      params: { user: OWNER },
    });
    expect(edit.status).toBe(200);
    const week2 = await call(shiftReport, `/api/v1/shift-report/3?report_type=Week&week=${monday}&limit=50&search=jordan`);
    expect(week2.body.items[0].shifts[monday]).toMatchObject({ start: "10:00:00", end: "18:00:00", scheduled_start: "07:00:00" });
    const tue = dayjs(monday).add(1, "day").format("YYYY-MM-DD");
    expect(week2.body.items[0].shifts[tue].start).toBe("07:00:00");

    const del = await call(shiftDelete, "/api/v1/shift-delete/3", { method: "DELETE", body: { user_id: OWNER, shift_date: tue, shift_rule_id: day.shift_rule_id } });
    expect(del.status).toBe(200);
    const week3 = await call(shiftReport, `/api/v1/shift-report/3?report_type=Week&week=${monday}&limit=50&search=jordan`);
    expect(week3.body.items[0].shifts[tue].source).toBeNull();
  });

  it("pending / approved leave shows up as time_offs on the schedule", async () => {
    const s = monthStart();
    const { body } = await call(shiftReport, `/api/v1/shift-report/3?report_type=Month&week=${s.format("YYYY-MM-DD")}&limit=50`);
    const aisha = body.items.find((m: { user_id: string }) => m.user_id === AISHA);
    expect(Object.values(aisha.shifts).some((d) => (d as { time_offs: unknown[] }).time_offs.length > 0)).toBe(true);
  });
});

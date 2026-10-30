/**
 * Timesheets › View & Edit — API contract + write round-trip tests.
 * Shapes follow the live React Query cache (QUERY SHAPES of ["list","USER_TIMESHEETS",…]).
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { shapeErrors, type Shape } from "./shape";

import { GET as userTimesheet } from "@/app/api/v1/reports/user-time-sheet/[org]/[user]/route";
import { POST as addSlot } from "@/app/api/v1/add/time-entries-slot/[org]/[user]/route";
import { POST as addPlain } from "@/app/api/v1/add/time-entries/[org]/[user]/route";
import { PUT as editSlot } from "@/app/api/v1/edit/time-entries-slot/[org]/[user]/route";
import { PUT as editPlain } from "@/app/api/v1/edit/time-entries/[org]/[user]/route";
import { PUT as manualEdit } from "@/app/api/v1/manual-entry-edit/time-entries/[org]/[user]/route";
import { PUT as manualEditSlot } from "@/app/api/v1/manual-entry-edit/time-entries-slot/[org]/[user]/route";
import { PUT as splitSlot } from "@/app/api/v1/split/time-entries-slot/[org]/[user]/route";
import { PUT as splitPlain } from "@/app/api/v1/split/time-entries/[org]/[user]/route";
import { DELETE as deleteBlock } from "@/app/api/v1/delete/time-entries-block/[org]/[user]/route";
import { DELETE as deletePlain } from "@/app/api/v1/delete/time-entries/[org]/[user]/route";
import { DELETE as manualDelete } from "@/app/api/v1/manual-delete/time-entries/[org]/[user]/route";
import { POST as bulkDelete } from "@/app/api/v1/bulk-delete/time-entries/[org]/[user]/route";
import { GET as allTasks } from "@/app/api/v1/project/all-tasks/[org]/[project]/[user]/route";
import { GET as projectTasksRoute } from "@/app/api/v1/project/tasks/[org]/[project]/route";
import { GET as userSummary } from "@/app/api/v1/dashboard/user-summary/[org]/route";
import { resetStore } from "@/mock/store";
import { dayjs } from "@/mock/tz";
import type { TimesheetEntry, UserTimesheetResponse } from "@/lib/types/timesheets";

const USER = "0f9c2a71-5b3e-7d41-9a6c-2e8b4d1f7a30";
const TZ = "America/New_York";
const P = { org: "3", user: USER };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (req: NextRequest, ctx: { params: Promise<any> }) => Promise<Response>;

async function call(handler: AnyHandler, path: string, init: { method?: string; body?: unknown; params?: Record<string, string> } = {}) {
  const req = new NextRequest(new URL(`http://localhost${path}`), {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
  });
  const res = await handler(req, { params: Promise.resolve(init.params ?? P) });
  return { status: res.status, body: await res.json().catch(() => null), res };
}

const expectShape = (value: unknown, shape: Shape) => expect(shapeErrors(value, shape)).toEqual([]);

const ENTRY: Shape = {
  org_name: "string",
  project_id: "string",
  project_name: "string",
  client_name: "string",
  task_id: "string|null",
  task_name: "string|null",
  duration_seconds: "number",
  duration: "dur",
  activity_percentage: "number",
  is_locked: "boolean",
  is_manual: "boolean",
  is_origin_manual: "boolean|null",
  is_idle: "boolean",
  is_paid: "boolean",
  notes: "string",
  started_at: "string",
  stopped_at: "string",
  is_running: "boolean",
  created_by: "string",
  local_activity_duration_id: "string",
  client_local_id: "string",
};
const TIME_OFF: Shape = {
  request_id: "number",
  policy_id: "number",
  policy_name: "string",
  duration_state: "string",
  duration_seconds: "number",
  duration: "dur",
  is_paid: "boolean",
  started_at: "string",
  stopped_at: "string",
};
const DAY: Shape = {
  total_user_duration_seconds: "number",
  total_user_duration: "dur",
  break_duration_second: "number",
  user_break_duration: "dur",
  entries: [ENTRY],
  time_off: [TIME_OFF],
  day_time_off_seconds: "number",
  day_time_off_time: "dur",
  day_time_off_paid_seconds: "number",
  day_time_off_paid_time: "dur",
  day_time_off_unpaid_seconds: "number",
  day_time_off_unpaid_time: "dur",
  regular_day_total_second: "number",
  regular_day_total_time: "dur",
  day_total_duration_second: "number",
  day_total_time: "dur",
  average_activity: "number",
  average_activity_seconds: "number",
};
const TOP: Shape = {
  user_id: "string",
  organization_id: "number",
  user: {
    user_id: "string",
    name: "string",
    email: "string",
    profile_picture: "string|null",
    role_name: "string",
    start_date: "string|null",
    timezone: "string",
    clients: [{ id: "number", name: "string" }],
    projects: [{ id: "string", name: "string" }],
    teams: [{ id: "number", name: "string" }],
    managers: [{ user_id: "string", name: "string", projects: [{ id: "string", name: "string" }], profile_picture: "string|null" }],
  },
  user_total_spent: "dur",
  regular_total_spent: "dur",
  pto_time_spend: "dur",
  user_average_activity: "string",
  report: "any",
  time_off_summary: {
    total_seconds: "number",
    total_hours: "dur",
    paid_seconds: "number",
    paid_hours: "dur",
    unpaid_seconds: "number",
    unpaid_hours: "dur",
    days_count: "number",
    policies_count: "number",
  },
  limit: "number",
  offset: "number",
  total_dates: "number",
};

const today = dayjs().tz(TZ).format("YYYY-MM-DD");
const weekAgo = dayjs().tz(TZ).subtract(6, "day").format("YYYY-MM-DD");
const sheetPath = (start = weekAgo, end = today, extra = "") => {
  const limit = /[?&]limit=(\d+)/.exec(extra)?.[1] ?? "10";
  return `/api/v1/reports/user-time-sheet/3/${USER}?start_date=${start}&end_date=${end}&timezone_str=${encodeURIComponent(TZ)}&offset=0&limit=${limit}${extra.replace(/&limit=\d+/, "")}`;
};

async function sheet(start = weekAgo, end = today, extra = ""): Promise<UserTimesheetResponse> {
  const { status, body } = await call(userTimesheet, sheetPath(start, end, extra));
  expect(status).toBe(200);
  return body;
}

/** A past weekday with tracked entries (not today, so nothing is cut by "now"). */
async function dayWithEntries() {
  const s = await sheet(dayjs().tz(TZ).subtract(20, "day").format("YYYY-MM-DD"), dayjs().tz(TZ).subtract(1, "day").format("YYYY-MM-DD"), "&limit=30");
  const date = Object.keys(s.report).find((d) => s.report[d].entries.filter((e) => !e.is_manual).length >= 3)!;
  return { date, day: s.report[date] };
}

const secs = (hms: string) => hms.split(":").reduce((a, b) => a * 60 + Number(b), 0);

// Building the store takes a few seconds (400 days x 8 members of time entries).
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
beforeAll(() => {
  resetStore();
});

describe("GET /reports/user-time-sheet", () => {
  it("matches the captured shape (every day + entry)", async () => {
    const s = await sheet();
    expectShape(s, TOP);
    expect(Object.keys(s.report)).toHaveLength(7);
    for (const d of Object.values(s.report)) expectShape(d, DAY);
    expect(s.total_dates).toBe(7);
    expect(s.user.name).toBe("Jordan Avery");
    expect(s.user_average_activity).toMatch(/^\d+(\.\d+)?%$/);
  });

  it("paginates dates (newest first) with offset / limit", async () => {
    const start = dayjs().tz(TZ).subtract(29, "day").format("YYYY-MM-DD");
    const p1 = await sheet(start, today, "");
    expect(p1.total_dates).toBe(30);
    expect(Object.keys(p1.report)[0]).toBe(today);
    const { body: p3 } = await call(userTimesheet, sheetPath(start, today).replace("offset=0", "offset=20"));
    expect(Object.keys(p3.report)).toHaveLength(10);
    expect(Object.keys(p3.report).at(-1)).toBe(start);
  });

  it("filters by project, time type and activity level", async () => {
    const start = dayjs().tz(TZ).subtract(30, "day").format("YYYY-MM-DD");
    const all = await sheet(start, today, "&limit=31");
    const entries = Object.values(all.report).flatMap((d) => d.entries);
    const project = entries[0].project_id;
    const byProject = Object.values((await sheet(start, today, `&limit=31&project_id=${project}`)).report).flatMap((d) => d.entries);
    expect(byProject.length).toBeGreaterThan(0);
    expect(byProject.every((e) => e.project_id === project)).toBe(true);
    const idle = Object.values((await sheet(start, today, "&limit=31&time_type=idle")).report).flatMap((d) => d.entries);
    expect(idle.length).toBeGreaterThan(0);
    expect(idle.every((e) => e.is_idle)).toBe(true);
    const high = Object.values((await sheet(start, today, "&limit=31&activity_level=High")).report).flatMap((d) => d.entries);
    expect(high.every((e) => e.activity_percentage >= 60)).toBe(true);
  });

  it("totals add up (worked + time off = total)", async () => {
    const start = dayjs().tz(TZ).subtract(89, "day").format("YYYY-MM-DD");
    const s = await sheet(start, today, "&limit=90");
    const worked = Object.values(s.report).reduce((a, d) => a + d.total_user_duration_seconds, 0);
    expect(secs(s.regular_total_spent)).toBe(worked);
    expect(secs(s.user_total_spent)).toBe(worked + secs(s.pto_time_spend));
  });

  it("empty scenario returns zeroed days", async () => {
    const { body } = await call(userTimesheet, `${sheetPath()}&scenario=empty`);
    expect(Object.values(body.report as Record<string, { entries: unknown[] }>).every((d) => d.entries.length === 0)).toBe(true);
    expect(body.user_total_spent).toBe("00:00:00");
    expect(body.user_average_activity).toBe("0.0%");
  });

  it("export_type=excel returns CSV, pdf returns a PDF", async () => {
    const csv = await call(userTimesheet, `${sheetPath()}&export_type=excel`);
    expect(csv.res.headers.get("content-type")).toContain("text/csv");
    const pdf = await call(userTimesheet, `${sheetPath()}&export_type=pdf`);
    expect(pdf.res.headers.get("content-type")).toBe("application/pdf");
  });
});

describe("project tasks", () => {
  it("GET /project/all-tasks and /project/tasks return {items:[{id,name}]}", async () => {
    const a = await call(allTasks, `/api/v1/project/all-tasks/3/p-website/${USER}`, { params: { org: "3", project: "p-website", user: USER } });
    expectShape(a.body, { items: [{ id: "string", name: "string" }] });
    expect(a.body.items.length).toBeGreaterThan(0);
    const b = await call(projectTasksRoute, `/api/v1/project/tasks/3/p-website`, { params: { org: "3", project: "p-website" } });
    expectShape(b.body, { items: [{ id: "string", name: "string" }] });
  });
});

describe("writes", () => {
  beforeEach(() => {
    resetStore();
  });
  const q = (o: Record<string, string>) => new URLSearchParams({ timezone_str: TZ, ...o }).toString();

  it("add (slot + plain): creates a manual entry, updates totals and the Dashboard", async () => {
    const date = dayjs().tz(TZ).subtract(3, "day").format("YYYY-MM-DD");
    const before = await sheet(date, date);
    const dashBefore = await call(userSummary as AnyHandler, `/api/v1/dashboard/user-summary/3?start_date=${date}&end_date=${date}&type=employee`);
    // Find a free hour late in the evening.
    const res = await call(addSlot, `/api/v1/add/time-entries-slot/3/${USER}?timezone_str=${encodeURIComponent(TZ)}`, {
      method: "POST",
      body: { started_at_utc: `${date}T21:00:00`, stopped_at_utc: `${date}T22:30:00`, project_id: "p-website", task_id: "p-website-t1", notes: "Late fix" },
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    const after = await sheet(date, date);
    expect(after.report[date].total_user_duration_seconds).toBe(before.report[date].total_user_duration_seconds + 5400);
    const added = after.report[date].entries.find((e) => e.notes === "Late fix")!;
    expect(added).toMatchObject({ is_manual: true, task_name: "Design QA", created_by: "Jordan Avery", local_activity_duration_id: "" });
    const dashAfter = await call(userSummary as AnyHandler, `/api/v1/dashboard/user-summary/3?start_date=${date}&end_date=${date}&type=employee`);
    expect(dashAfter.body.data.current.total_regular_seconds).toBe(dashBefore.body.data.current.total_regular_seconds + 5400);

    const plain = await call(addPlain, `/api/v1/add/time-entries/3/${USER}?timezone_str=${encodeURIComponent(TZ)}`, {
      method: "POST",
      body: { started_at_utc: `${date}T23:00:00`, stopped_at_utc: `${date}T23:30:00`, project_id: "p-website", notes: "" },
    });
    expect(plain.status).toBe(200);
  });

  it("add: validation (missing project, end before start, overlap, future)", async () => {
    const { date, day } = await dayWithEntries();
    const url = `/api/v1/add/time-entries-slot/3/${USER}?timezone_str=${encodeURIComponent(TZ)}`;
    expect((await call(addSlot, url, { method: "POST", body: { started_at_utc: `${date}T21:00:00`, stopped_at_utc: `${date}T22:00:00`, project_id: "" } })).status).toBe(422);
    expect((await call(addSlot, url, { method: "POST", body: { started_at_utc: `${date}T22:00:00`, stopped_at_utc: `${date}T21:00:00`, project_id: "p-website" } })).status).toBe(422);
    const e = day.entries[0];
    const overlap = await call(addSlot, url, { method: "POST", body: { started_at_utc: e.started_at, stopped_at_utc: e.stopped_at, project_id: "p-website" } });
    expect(overlap.status).toBe(409);
    expect(overlap.body.message).toMatch(/overlaps/);
    const tomorrow = dayjs().tz(TZ).add(1, "day").format("YYYY-MM-DD");
    expect((await call(addSlot, url, { method: "POST", body: { started_at_utc: `${tomorrow}T10:00:00`, stopped_at_utc: `${tomorrow}T11:00:00`, project_id: "p-website" } })).status).toBe(422);
  });

  it("edit (slot): shortening a tracked entry reduces the day total", async () => {
    const { date, day } = await dayWithEntries();
    const e = day.entries.find((x) => !x.is_manual && x.duration_seconds > 600)!;
    const newStop = dayjs(e.stopped_at).subtract(5, "minute").format("YYYY-MM-DDTHH:mm:ss");
    const res = await call(editSlot, `/api/v1/edit/time-entries-slot/3/${USER}?${q({ old_started_at: e.started_at, old_stopped_at: e.stopped_at })}`, {
      method: "PUT",
      body: {
        entries: { started_at_utc: e.started_at, stopped_at_utc: newStop, project_id: e.project_id, task_id: e.task_id, notes: "Trimmed" },
        local_activity_duration_id: e.local_activity_duration_id.split(","),
        client_local_id: e.client_local_id.split(","),
      },
    });
    expect(res.status).toBe(200);
    const after = await sheet(date, date);
    expect(after.report[date].total_user_duration_seconds).toBe(day.total_user_duration_seconds - 300);
    const edited = after.report[date].entries.find((x) => x.notes === "Trimmed")!;
    expect(edited.created_by).toBe("Jordan Avery");
    expect(edited.stopped_at).toBe(newStop);
  });

  it("edit requires notes and (plain variant) finds the entry by old times", async () => {
    const { date, day } = await dayWithEntries();
    const e = day.entries.find((x) => !x.is_manual)!;
    const path = `/api/v1/edit/time-entries/3/${USER}?${q({ old_started_at: e.started_at, old_stopped_at: e.stopped_at })}`;
    const bad = await call(editPlain, path, { method: "PUT", body: { started_at_utc: e.started_at, stopped_at_utc: e.stopped_at, project_id: e.project_id, notes: "" } });
    expect(bad.status).toBe(422);
    const good = await call(editPlain, path, { method: "PUT", body: { started_at_utc: e.started_at, stopped_at_utc: e.stopped_at, project_id: "p-internal", notes: "Moved" } });
    expect(good.status).toBe(200);
    const after = await sheet(date, date);
    expect(after.report[date].entries.find((x) => x.notes === "Moved")!.project_id).toBe("p-internal");
  });

  it("manual entry: manual-entry-edit + manual-delete", async () => {
    const date = dayjs().tz(TZ).subtract(4, "day").format("YYYY-MM-DD");
    await call(addSlot, `/api/v1/add/time-entries-slot/3/${USER}?timezone_str=${encodeURIComponent(TZ)}`, {
      method: "POST",
      body: { started_at_utc: `${date}T20:00:00`, stopped_at_utc: `${date}T21:00:00`, project_id: "p-mobile", notes: "Manual" },
    });
    const old = { old_started_at: `${date}T20:00:00`, old_stopped_at: `${date}T21:00:00` };
    const edited = await call(manualEdit, `/api/v1/manual-entry-edit/time-entries/3/${USER}?${q(old)}`, {
      method: "PUT",
      body: { started_at_utc: `${date}T20:00:00`, stopped_at_utc: `${date}T20:45:00`, project_id: "p-mobile", task_id: null, notes: "Manual edited" },
    });
    expect(edited.status).toBe(200);
    // slot variant exists too (manual entries are addressed by time there as well when no ids are sent)
    const slotEdit = await call(manualEditSlot, `/api/v1/manual-entry-edit/time-entries-slot/3/${USER}?${q({ old_started_at: `${date}T20:00:00`, old_stopped_at: `${date}T20:45:00` })}`, {
      method: "PUT",
      body: { started_at_utc: `${date}T20:00:00`, stopped_at_utc: `${date}T20:40:00`, project_id: "p-mobile", notes: "Manual edited 2" },
    });
    expect(slotEdit.status).toBe(200);
    const del = await call(manualDelete, `/api/v1/manual-delete/time-entries/3/${USER}?${q({ started_at_utc: `${date}T20:00:00`, stopped_at_utc: `${date}T20:40:00` })}`, {
      method: "DELETE",
      body: { reason: "Duplicate" },
    });
    expect(del.status).toBe(200);
    const after = await sheet(date, date);
    expect(after.report[date].entries.some((x) => x.notes.startsWith("Manual"))).toBe(false);
  });

  it("split (slot + plain): total unchanged, entry count +1, validation", async () => {
    const { date, day } = await dayWithEntries();
    const e = day.entries.find((x) => !x.is_manual && x.duration_seconds > 600)!;
    const mid = dayjs(e.started_at).add(5, "minute").format("YYYY-MM-DDTHH:mm:ss");
    const parts = [
      { started_at_utc: e.started_at, stopped_at_utc: mid, project_id: e.project_id, task_id: e.task_id, notes: "split" },
      { started_at_utc: mid, stopped_at_utc: e.stopped_at, project_id: "p-internal", task_id: null, notes: "split" },
    ];
    const gap = [parts[0], { ...parts[1], started_at_utc: dayjs(mid).add(1, "minute").format("YYYY-MM-DDTHH:mm:ss") }];
    const ids = { local_activity_duration_id: [e.local_activity_duration_id], client_local_id: [e.client_local_id] };
    const url = `/api/v1/split/time-entries-slot/3/${USER}?${q({})}`;
    expect((await call(splitSlot, url, { method: "PUT", body: { entries: gap, ...ids } })).status).toBe(422);
    const res = await call(splitSlot, url, { method: "PUT", body: { entries: parts, ...ids } });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Time entry splitted successfully");
    const after = await sheet(date, date);
    expect(after.report[date].total_user_duration_seconds).toBe(day.total_user_duration_seconds);
    expect(after.report[date].entries).toHaveLength(day.entries.length + 1);

    // plain variant: addressed by started_at / stopped_at
    const second = after.report[date].entries.find((x) => x.started_at === mid)!;
    const mid2 = dayjs(second.started_at).add(2, "minute").format("YYYY-MM-DDTHH:mm:ss");
    const plain = await call(splitPlain, `/api/v1/split/time-entries/3/${USER}?${q({ started_at: second.started_at, stopped_at: second.stopped_at })}`, {
      method: "PUT",
      body: [
        { started_at_utc: second.started_at, stopped_at_utc: mid2, project_id: "p-internal", task_id: null, notes: "again" },
        { started_at_utc: mid2, stopped_at_utc: second.stopped_at, project_id: "p-internal", task_id: null, notes: "again" },
      ],
    });
    expect(plain.status).toBe(200);
  });

  it("delete (block + plain) requires a reason and lowers totals", async () => {
    const { date, day } = await dayWithEntries();
    const [a, b] = day.entries.filter((x) => !x.is_manual);
    const blockUrl = `/api/v1/delete/time-entries-block/3/${USER}?${q({ started_at_utc: a.started_at, stopped_at_utc: a.stopped_at })}`;
    expect((await call(deleteBlock, blockUrl, { method: "DELETE", body: { local_activity_duration_id: [a.local_activity_duration_id], reasons: "" } })).status).toBe(422);
    expect((await call(deleteBlock, blockUrl, { method: "DELETE", body: { local_activity_duration_id: [a.local_activity_duration_id], reasons: "Personal time" } })).status).toBe(200);
    const plain = await call(deletePlain, `/api/v1/delete/time-entries/3/${USER}?${q({ started_at_utc: b.started_at, stopped_at_utc: b.stopped_at })}`, {
      method: "DELETE",
      body: { reason: "Wrong project" },
    });
    expect(plain.status).toBe(200);
    const after = await sheet(date, date);
    expect(after.report[date].total_user_duration_seconds).toBe(day.total_user_duration_seconds - a.duration_seconds - b.duration_seconds);
  });

  it("bulk delete removes every listed entry", async () => {
    const { date, day } = await dayWithEntries();
    const pick: TimesheetEntry[] = day.entries.slice(0, 3);
    const items = pick.map((e) =>
      e.local_activity_duration_id
        ? { started_at_utc: dayjs.tz(e.started_at, TZ).format(), stopped_at_utc: dayjs.tz(e.stopped_at, TZ).format(), type: "block", local_activity_duration_id: [e.local_activity_duration_id], reasons: "cleanup" }
        : { started_at_utc: dayjs.tz(e.started_at, TZ).format(), stopped_at_utc: dayjs.tz(e.stopped_at, TZ).format(), type: e.is_manual ? "manual" : "tracked" },
    );
    const res = await call(bulkDelete, `/api/v1/bulk-delete/time-entries/3/${USER}`, { method: "POST", body: { timezone_str: TZ, items } });
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(3);
    const after = await sheet(date, date);
    expect(after.report[date].entries).toHaveLength(day.entries.length - 3);
    expect(after.report[date].total_user_duration_seconds).toBe(day.total_user_duration_seconds - pick.reduce((s, e) => s + e.duration_seconds, 0));
  });
});

/**
 * Contract tests for the Activity endpoints (Screenshots, Deleted Screenshots, App, URLs).
 * Shapes follow the live React Query cache ("QUERY SHAPES" in the capture).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { shapeErrors, type Shape } from "./shape";
import { resetStore } from "@/mock/store";
import { GET as screenshots } from "@/app/api/v1/activity-screenshots/[org]/route";
import { DELETE as deleteSlot } from "@/app/api/v1/delete/screenshot-slot/[org]/[user]/route";
import { GET as deletedList } from "@/app/api/v1/audit/deleted-screenshots/[org]/route";
import { POST as restore } from "@/app/api/v1/deleted-activity-screenshots/[org]/[id]/restore/route";
import { DELETE as purge } from "@/app/api/v1/deleted-activity-screenshots/[org]/[id]/route";
import { POST as bulkRestore } from "@/app/api/v1/deleted-activity-screenshots/[org]/bulk-restore/route";
import { POST as bulkAsync } from "@/app/api/v1/bulk-activity-screenshots/[org]/bulk-download/async/route";
import { GET as bulkStatus } from "@/app/api/v1/bulk-activity-screenshots/[org]/bulk-download/status/[task]/route";
import { POST as trackView } from "@/app/api/v1/track-screenshot-detail-view/[org]/route";
import { GET as appUsage } from "@/app/api/v1/application-usage-project/[org]/route";
import { GET as myUrls } from "@/app/api/v1/activity/urls/[org]/me/route";
import { GET as grid } from "@/app/api/v1/activity/urls/[org]/grid/route";
import { GET as admin } from "@/app/api/v1/activity/urls/[org]/admin/route";
import { GET as drilldown } from "@/app/api/v1/activity/urls/[org]/drilldown/route";
import { GET as byDate } from "@/app/api/v1/activity/urls/[org]/view_by_date/route";
import { GET as timezones } from "@/app/api/v1/get-timezone/route";
import { GET as savedList, POST as savedCreate } from "@/app/api/v1/saved-filters/[org]/route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type H = (req: NextRequest, ctx: any) => Promise<Response>;
async function call(h: H, path: string, init: { method?: string; body?: unknown; params?: Record<string, string> } = {}) {
  const req = new NextRequest(new URL(`http://localhost${path}`), {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: init.body === undefined ? undefined : { "content-type": "application/json" },
  });
  const res = await h(req, { params: Promise.resolve({ org: "3", ...(init.params ?? {}) }) });
  return { status: res.status, body: await res.json() };
}
const ok = (v: unknown, s: Shape) => expect(shapeErrors(v, s)).toEqual([]);

const USER = "0f9c2a71-5b3e-7d41-9a6c-2e8b4d1f7a30";
const TZ = "America%2FNew_York";
function lastWeekday() {
  for (let n = 1; n < 6; n++) {
    const ny = new Date(Date.now() - n * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    if (![0, 6].includes(new Date(`${ny}T12:00:00Z`).getUTCDay())) return ny;
  }
  return "";
}
const DAY = lastWeekday();

beforeEach(() => {
  resetStore();
});

const URLS_DOMAIN: Shape = { domain: "string", link_count: "number", total_time: "dur", urls: [{ url: "string", project: "string", task: "string", time_spent: "dur" }] };
const DELETED_RECORD: Shape = {
  id: "number",
  screenshot_url: "string|null",
  thumbnail_url: "null",
  member_name: "string",
  member_id: "string",
  project_name: "string",
  task_name: "string|null",
  started_at: "string",
  stopped_at: "string",
  captured_at: "string",
  duration_seconds: "number",
  deleted_by_name: "string",
  deleted_at: "string",
  expiration_date: "date",
  is_expiring_soon: "boolean",
  delete_reason: "string",
  deletion_type: "string",
  is_hipaa_compliance: "boolean",
};

describe("screenshots + deleted screenshots", () => {
  it("delete slot → appears in deleted list → restore puts it back", async () => {
    const q = `/api/v1/activity-screenshots/3?activity_date=${DAY}&timezone=${TZ}&view_mode=every_ten_minutes&user_id=${USER}`;
    const before = (await call(screenshots, q)).body;
    const slot = before.hourly_slots.flatMap((h: { ten_minute_slots: unknown[] }) => h.ten_minute_slots).find((s: { screenshots: unknown[] }) => s.screenshots.length) as {
      local_activity_duration_ids: string;
      total_duration_seconds: number;
    };
    const del = await call(deleteSlot, `/api/v1/delete/screenshot-slot/3/${USER}`, { method: "DELETE", body: { local_activity_duration_id: [slot.local_activity_duration_ids], delete_reason: "contract test" }, params: { user: USER } });
    expect(del.status).toBe(200);
    const after = (await call(screenshots, q)).body;
    expect(after.total_hourly_slots >= 0).toBe(true);
    expect(after.avg_activity_percentage).toBeTypeOf("number");

    const list = (await call(deletedList, `/api/v1/audit/deleted-screenshots/3?page=1&page_size=100&timezone=${TZ}`)).body;
    ok(list, {
      records: [DELETED_RECORD],
      total_count: "number",
      page: "number",
      page_size: "number",
      total_pages: "number",
      filters_applied: { member_id: "any", member_search: "any", project_id: "any", task_id: "any", start_date: "any", end_date: "any", deletion_type: "any", timezone: "string" },
    });
    const mine = list.records.filter((r: { delete_reason: string }) => r.delete_reason === "contract test");
    expect(mine.length).toBeGreaterThan(0);

    const res = await call(restore, `/api/v1/deleted-activity-screenshots/3/${mine[0].id}/restore`, { method: "POST", params: { id: String(mine[0].id) } });
    expect(res.status).toBe(200);
    const list2 = (await call(deletedList, `/api/v1/audit/deleted-screenshots/3?page=1&page_size=100&timezone=${TZ}`)).body;
    expect(list2.records.filter((r: { delete_reason: string }) => r.delete_reason === "contract test")).toHaveLength(0);
    const restored = (await call(screenshots, q)).body;
    expect(restored.total_work).toBe(before.total_work);
  });

  it("permanent delete, bulk restore, bulk download stub and view tracking", async () => {
    const list = (await call(deletedList, `/api/v1/audit/deleted-screenshots/3?page=1&page_size=10`)).body;
    const [a, b] = list.records;
    expect((await call(purge, `/api/v1/deleted-activity-screenshots/3/${a.id}`, { method: "DELETE", params: { id: String(a.id) } })).status).toBe(200);
    expect((await call(bulkRestore, `/api/v1/deleted-activity-screenshots/3/bulk-restore`, { method: "POST", body: { ids: [b.id] } })).status).toBe(200);
    const job = (await call(bulkAsync, `/api/v1/bulk-activity-screenshots/3/bulk-download/async`, { method: "POST", body: { user_id: USER, start_date: DAY, end_date: DAY, timezone: "America/New_York" } })).body;
    const task = job.task_id ?? job.data?.task_id;
    expect(task).toBeTruthy();
    expect((await call(bulkStatus, `/api/v1/bulk-activity-screenshots/3/bulk-download/status/${task}`, { params: { task: String(task) } })).status).toBe(200);
    expect((await call(trackView, `/api/v1/track-screenshot-detail-view/3?captured_at=${DAY}T14:00:00&timezone=${TZ}&user_id=${USER}`, { method: "POST", body: {} })).status).toBe(200);
  });
});

describe("app usage", () => {
  it("GET /application-usage-project", async () => {
    const { body } = await call(appUsage, `/api/v1/application-usage-project/3?date=${DAY}&timezone=${TZ}&user_id=${USER}`);
    ok(body.top_5_applications, [{ application_name: "string", total_usage_interval: "dur" }]);
    expect(body.organization_timezone).toBeTypeOf("string");
    expect(body.records.length).toBeGreaterThan(0);
    for (const rec of body.records) {
      expect(rec.hour_bucket).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      for (const [k, v] of Object.entries(rec)) if (k !== "hour_bucket") ok(v, { total_usage_interval: "dur", applications: [{ application_name: "string", usage_seconds: "number", usage_seconds_interval: "dur", project: "string" }] });
    }
  });
});

describe("urls", () => {
  const PAG: Shape = { total_days: "number", limit: "number", offset: "number", total_pages: "number" };
  it("GET /activity/urls/{org}/me", async () => {
    const { body } = await call(myUrls, `/api/v1/activity/urls/3/me?start_date=${DAY}&end_date=${DAY}&timezone=${TZ}&limit=20&offset=0`);
    ok(body, { pagination: PAG, days: [{ date: "date", date_formatted: "string", url_count: "number", total_time: "dur" }] });
    expect(body.days.length).toBe(1);
  });
  it("GET /activity/urls/{org}/grid (week)", async () => {
    const { body } = await call(grid, `/api/v1/activity/urls/3/grid?start_date=${DAY}&end_date=${DAY}&mode=week&limit=20&offset=0`);
    expect(body.total).toBeTypeOf("number");
    expect(body.buckets).toHaveLength(body.bucketLabels.length);
    for (const e of body.employees) {
      expect(e.employee_id).toBeTypeOf("string");
      for (const s of Object.values(e.slots)) ok(s, { urlCount: "number", alertCount: "number", status: "string" });
    }
  });
  it("GET /activity/urls/{org}/admin + view_by_date + drilldown", async () => {
    const a = (await call(admin, `/api/v1/activity/urls/3/admin?start_date=${DAY}&end_date=${DAY}&user_id=${USER}&limit=20&offset=0`)).body;
    ok(a, { pagination: PAG, days: [{ date: "date", date_formatted: "string", url_count: "number", total_time: "dur", domains: [URLS_DOMAIN] }] });
    const v = (await call(byDate, `/api/v1/activity/urls/3/view_by_date?start_date=${DAY}&end_date=${DAY}&user_id=${USER}`)).body;
    ok(v, { days: [{ date: "date", domains: [URLS_DOMAIN] }] });
    const d = (await call(drilldown, `/api/v1/activity/urls/3/drilldown?date=${DAY.slice(0, 8)}01&date_end=${DAY}&user_id=${USER}&group_by_day=true&limit=20&offset=0`)).body;
    ok(d, { pagination: { total_pages: "number", limit: "number", offset: "number" }, days: [{ date: "date", url_count: "number" }] });
  });
});

describe("shared toolbar endpoints", () => {
  it("GET /get-timezone and saved filters CRUD", async () => {
    const tz = (await call(timezones, `/api/v1/get-timezone`)).body;
    ok(tz, [{ id: "number", name: "string", alternative_name: "string", continent_code: "string", continent_name: "string", country_name: "string", country_code: "string", raw_offset_in_minutes: "number", abbreviation: "string" }]);
    const created = await call(savedCreate, `/api/v1/saved-filters/3`, { method: "POST", body: { page_key: "timesheet", name: "Idle only", filters: { time_type: true } } });
    expect(created.status).toBe(200);
    const list = (await call(savedList, `/api/v1/saved-filters/3?page_key=timesheet`)).body;
    expect(list.success).toBe(true);
    expect(list.data.map((f: { name: string }) => f.name)).toContain("Idle only");
    expect((await call(savedCreate, `/api/v1/saved-filters/3`, { method: "POST", body: { page_key: "timesheet", name: "" } })).status).toBe(422);
  });
});

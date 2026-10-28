/**
 * API contract tests: call every mock route handler and assert the response matches the
 * shape observed on the live TimeWorks API (see README "Observed API contract").
 * Run: npm test
 */
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { shapeErrors, type Shape } from "./shape";

import { GET as userDetails } from "@/app/api/v1/user/details/route";
import { GET as userPermission } from "@/app/api/v1/user/permission/[org]/route";
import { GET as sidebar } from "@/app/api/v1/user-permission/[org]/route";
import { GET as allProjects } from "@/app/api/v1/all/projects/[org]/route";
import { GET as allUsers } from "@/app/api/v1/all/user/[org]/route";
import { GET as userSummary } from "@/app/api/v1/dashboard/user-summary/[org]/route";
import { GET as graphData } from "@/app/api/v1/dashboard/graph-data/[org]/route";
import { GET as managerSecondary } from "@/app/api/v1/dashboard/manager-secondary/[org]/route";
import { GET as appUsageAll } from "@/app/api/v1/dashboard/app-usage-all/[org]/route";
import { GET as projectsTasksAll } from "@/app/api/v1/dashboard/projects-tasks-all/[org]/route";
import { GET as projectsClientsAll } from "@/app/api/v1/dashboard/projects-clients-all/[org]/route";
import { GET as topEmployeesAll } from "@/app/api/v1/dashboard/top-employees-all/[org]/route";
import { GET as lowActivityAll } from "@/app/api/v1/dashboard/low-activity-all/[org]/route";
import { GET as membersActivityAll } from "@/app/api/v1/dashboard/members-activity-all/[org]/route";
import { GET as weeklyLimitsAll } from "@/app/api/v1/dashboard/weekly-limits-all/[org]/route";
import { GET as dailyLimitsAll } from "@/app/api/v1/dashboard/daily-limits-all/[org]/route";
import { GET as screenshots } from "@/app/api/v1/activity-screenshots/[org]/route";
import { POST as reset } from "@/app/api/%5F%5Freset/route";

type Handler = (req: NextRequest) => Promise<Response>;

async function call(handler: Handler, path: string) {
  const res = await handler(new NextRequest(new URL(`http://localhost${path}`)));
  expect(res.status).toBe(200);
  return res.json();
}

function expectShape(value: unknown, shape: Shape) {
  expect(shapeErrors(value, shape)).toEqual([]);
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date();
const monthAgo = new Date(Date.now() - 30 * 86_400_000);
const RANGE = `start_date=${ymd(monthAgo)}&end_date=${ymd(today)}`;

/* ---------- shapes (from the live app's React Query cache) ---------- */

const TIMEZONE: Shape = {
  id: "number",
  name: "string",
  alternative_name: "string",
  continent_code: "string",
  continent_name: "string",
  country_name: "string",
  country_code: "string",
  raw_offset_in_minutes: "number",
  abbreviation: "string",
};

const EMPLOYEE_CURRENT: Record<string, Shape> = {
  total_work_seconds: "number",
  project_count: "number",
  activity_percentage: "number",
  total_pay_amount: "number",
  total_regular_seconds: "number",
  total_regular_time: "dur",
  total_regular_hours: "number",
  total_pto_seconds: "number",
  total_pto_hours: "dur",
  total_worked_time: "dur",
  total_hours: "number",
  total_pay_regular_amount: "number",
  pto_pay_amount: "number",
};

const APP_ITEM: Shape = { application_name: "string", type: "string", activity_percentage: "number", total_time_spent: "dur" };
const PROJECT_REPORT_ITEM: Shape = { project_name: "string", task_name: "string|null", avg_activity_percentage: "number", total_work: "dur" };

const TOP_EMPLOYEE: Shape = {
  user_id: "string",
  member_name: "string",
  email: "string",
  profile_image_url: "string|null",
  total_hours: "number",
  total_worked_time: "dur",
  total_regular_seconds: "number",
  total_regular_time: "dur",
  total_regular_hours: "number",
  total_pto_seconds: "number",
  total_pto_hours: "dur",
  project_count: "number",
  activity_percentage: "number",
  total_pay_regular_amount: "number",
  pto_pay_amount: "number",
  total_pay_amount: "number",
  total_bill_regular_amount: "number",
  pto_billable_amount: "number",
  total_bill_amount: "number",
  total_profit: "number",
};

const PROJECT_ROW: Shape = { project_id: "string", project_name: "string", client_name: "string", total_hours: "number", total_worked_time: "dur", total_bill_amount: "number" };
const LOW_ACTIVITY: Shape = { user_id: "string", member_name: "string", worked_time: "dur", activity_percentage: "number", profile_image_url: "string|null" };
const MEMBER_ACTIVITY: Record<string, Shape> = {
  user_id: "string",
  full_name: "string",
  email: "string",
  profile_image_url: "string|null",
  today_tracked: "dur",
  this_week_tracked: "dur",
  last_active: "string|null",
};
const LIMIT: Record<string, Shape> = {
  user_id: "string",
  full_name: "string",
  email: "string",
  profile_image_url: "string|null",
  used_time: "dur",
  used_seconds: "number",
  total_limit: "dur",
  limit_seconds: "number",
};
const paged = (item: Shape): Shape => ({ data: [item], total_count: "number" });

/* ---------- tests ---------- */

describe("user & permissions", () => {
  it("GET /user/details", async () => {
    const body = await call(userDetails, "/api/v1/user/details");
    expectShape(body, {
      user_id: "string",
      email: "string",
      full_name: "string",
      user_time_zone: "string",
      timezone: TIMEZONE,
      current_organization_id: "number",
      is_2fa_enabled: "boolean",
      profile_image_url: "string|null",
      role: { name: "string", slug: "string" },
      organizations: [{ organization_id: "number", organization_name: "string", organization_time_zone: "string", timezone: TIMEZONE }],
    });
    expect(body.role.name).toBe("Owner");
  });

  it("GET /user/permission/{org} grants team-dashboard", async () => {
    const body = await call(userPermission, "/api/v1/user/permission/3");
    expectShape(body, [{ slug: "string", permissions: "any" }]);
    expect(body.some((p: { permissions: Record<string, boolean> }) => p.permissions["team-dashboard"])).toBe(true);
  });

  it("GET /user-permission/{org} (sidebar tree)", async () => {
    const body = await call(sidebar, "/api/v1/user-permission/3");
    const page: Shape = { id: "string", name: "string", slug: "string", url: "null", read_permission: "boolean", write_permission: "boolean" };
    expectShape(body, [{ id: "string", name: "string", slug: "string", url: "null", children: "any", pages: [page] }]);
    expect(body.map((i: { slug: string }) => i.slug)).toContain("dashboard");
  });

  it("GET /all/projects/{org} and /all/user/{org}", async () => {
    expectShape(await call(allProjects, "/api/v1/all/projects/3"), [{ id: "string", name: "string" }]);
    expectShape(await call(allUsers, "/api/v1/all/user/3"), [{ user_id: "string", full_name: "string", email: "string", profile_image_url: "string|null" }]);
  });
});

describe("dashboard summary", () => {
  it("GET /dashboard/user-summary?type=employee", async () => {
    const body = await call(userSummary, `/api/v1/dashboard/user-summary/3?${RANGE}&type=employee`);
    expectShape(body, {
      data: { current: EMPLOYEE_CURRENT },
      projects_report: [PROJECT_REPORT_ITEM],
      application_usage_report: { all: [APP_ITEM], apps: [APP_ITEM], urls: [APP_ITEM] },
    });
    expect(body.application_usage_report.all.length).toBeGreaterThan(0);
    expect(body.application_usage_report.urls.every((u: { type: string }) => u.type === "url")).toBe(true);
  });

  it("GET /dashboard/user-summary?type=manager", async () => {
    const body = await call(userSummary, `/api/v1/dashboard/user-summary/3?${RANGE}&type=manager`);
    expectShape(body, {
      data: {
        current: { ...EMPLOYEE_CURRENT, total_bill_amount: "number", total_profit: "number", total_bill_regular_amount: "number", pto_billable_amount: "number" },
      },
      low_activity_users: [LOW_ACTIVITY],
      graph_data: {},
      top_employee_data: [TOP_EMPLOYEE],
      projects: [PROJECT_ROW],
      members_activity: [MEMBER_ACTIVITY],
      weekly_limits: [LIMIT],
      daily_limits: [LIMIT],
    });
    expect(body.top_employee_data.length).toBeGreaterThan(0);
  });

  it("values respond to the date range", async () => {
    const a = await call(userSummary, `/api/v1/dashboard/user-summary/3?${RANGE}&type=employee`);
    const earlier = new Date(Date.now() - 37 * 86_400_000);
    const end = new Date(Date.now() - 7 * 86_400_000);
    const b = await call(userSummary, `/api/v1/dashboard/user-summary/3?start_date=${ymd(earlier)}&end_date=${ymd(end)}&type=employee`);
    expect(a.data.current.total_work_seconds).not.toBe(b.data.current.total_work_seconds);
  });

  it("GET /dashboard/graph-data returns one point per day", async () => {
    const body = await call(graphData, `/api/v1/dashboard/graph-data/3?${RANGE}&type=manager`);
    expectShape(body, {
      graph_data: [
        {
          label: "date",
          total_worked_time: "dur",
          regular_worked: "number",
          pto_hours: "number",
          time_worked: "number",
          regular_bill: "number",
          pto_billable: "number",
          bills: "number",
          activity: "number",
        },
      ],
    });
    expect(body.graph_data).toHaveLength(31);
  });

  it("GET /dashboard/manager-secondary", async () => {
    const body = await call(managerSecondary, `/api/v1/dashboard/manager-secondary/3?${RANGE}&type=manager`);
    expectShape(body, { low_activity_users: [LOW_ACTIVITY], members_activity: [MEMBER_ACTIVITY], weekly_limits: [LIMIT], daily_limits: [LIMIT] });
    expect(body.members_activity.length).toBeLessThanOrEqual(6);
    expect(body.weekly_limits.length).toBeLessThanOrEqual(6);
  });
});

describe("View All lists", () => {
  it("GET /dashboard/app-usage-all paginates each tab", async () => {
    const body = await call(appUsageAll, `/api/v1/dashboard/app-usage-all/3?limit=20&offset=0&${RANGE}`);
    expectShape(body, { all: paged(APP_ITEM), apps: paged(APP_ITEM), urls: paged(APP_ITEM) });
    expect(body.all.data).toHaveLength(20);
    expect(body.all.total_count).toBeGreaterThan(20);
    const page2 = await call(appUsageAll, `/api/v1/dashboard/app-usage-all/3?limit=20&offset=20&${RANGE}`);
    expect(page2.all.data.length).toBe(body.all.total_count - 20);
    const search = await call(appUsageAll, `/api/v1/dashboard/app-usage-all/3?limit=20&offset=0&search=google&${RANGE}`);
    expect(search.all.data.every((r: { application_name: string }) => r.application_name.includes("google"))).toBe(true);
  });

  it("GET /dashboard/projects-tasks-all filters by project", async () => {
    const body = await call(projectsTasksAll, `/api/v1/dashboard/projects-tasks-all/3?limit=20&offset=0&project_id=p-mobile&${RANGE}`);
    expectShape(body, paged(PROJECT_REPORT_ITEM));
    expect(body.data.every((r: { project_name: string }) => r.project_name === "Mobile App v2")).toBe(true);
  });

  it("GET /dashboard/projects-clients-all, top-employees-all, low-activity-all, members-activity-all", async () => {
    expectShape(await call(projectsClientsAll, `/api/v1/dashboard/projects-clients-all/3?limit=20&offset=0&${RANGE}`), paged(PROJECT_ROW));
    expectShape(await call(topEmployeesAll, `/api/v1/dashboard/top-employees-all/3?limit=20&offset=0&${RANGE}`), paged(TOP_EMPLOYEE));
    expectShape(await call(lowActivityAll, `/api/v1/dashboard/low-activity-all/3?limit=20&offset=0&${RANGE}`), paged(LOW_ACTIVITY));
    const members = await call(membersActivityAll, `/api/v1/dashboard/members-activity-all/3?limit=20&offset=0&${RANGE}`);
    expectShape(members, paged({ ...MEMBER_ACTIVITY, organization_name: "string" }));
    expect(members.total_count).toBe(8);
  });

  it("filter_user_id narrows member lists", async () => {
    const all = await call(membersActivityAll, `/api/v1/dashboard/members-activity-all/3?limit=20&offset=0`);
    const one = await call(membersActivityAll, `/api/v1/dashboard/members-activity-all/3?limit=20&offset=0&filter_user_id=${all.data[0].user_id}`);
    expect(one.total_count).toBe(1);
  });

  it("GET /dashboard/weekly-limits-all and daily-limits-all", async () => {
    for (const handler of [weeklyLimitsAll, dailyLimitsAll]) {
      const body = await call(handler, `/api/v1/dashboard/x/3?limit=20&offset=0`);
      expectShape(body, paged({ ...LIMIT, progress_percentage: "number" }));
    }
  });
});

describe("activity screenshots", () => {
  it("every_ten_minutes", async () => {
    const body = await call(screenshots, `/api/v1/activity-screenshots/3?activity_date=${ymd(today)}&timezone=America%2FNew_York&view_mode=every_ten_minutes`);
    expectShape(body, {
      status: "string",
      is_work_screenshot_block_delete: "boolean",
      date: "date",
      total_hourly_slots: "number",
      total_work: "dur",
      avg_activity_percentage: "number",
      hourly_slots: [{ hour_slot: "dur", ten_minute_slots: [{ time_slot: "dur", activity_percentage: "number", screenshots: [{ id: "number", url: "string", project: "string|null" }] }] }],
      has_time_off: "boolean",
      time_off: "any",
    });
    expect(body.hourly_slots).toHaveLength(2);
    expect(body.hourly_slots[0].ten_minute_slots).toHaveLength(6);
  });

  it("all_records", async () => {
    const body = await call(screenshots, `/api/v1/activity-screenshots/3?activity_date=${ymd(today)}&view_mode=all_records`);
    expectShape(body, {
      status: "string",
      is_work_screenshot_block_delete: "boolean",
      date: "date",
      total_hourly_slots: "number",
      total_work: "dur",
      avg_activity_percentage: "number",
      hourly_buckets: [{ hour_slot: "dur", screenshots: [{ id: "number", url: "string", project: "string|null", captured_at_user_tz: "string" }] }],
      has_time_off: "boolean",
      time_off: "any",
    });
    expect(body.hourly_buckets[0].screenshots[0].captured_at_user_tz).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} (AM|PM)$/);
  });
});

describe("scenarios & reset", () => {
  it("?scenario=empty returns zeros and empty lists with the same shape", async () => {
    const body = await call(userSummary, `/api/v1/dashboard/user-summary/3?${RANGE}&type=employee&scenario=empty`);
    expect(body.data.current.total_worked_time).toBe("00:00:00");
    expect(body.application_usage_report.all).toEqual([]);
    const shots = await call(screenshots, `/api/v1/activity-screenshots/3?view_mode=every_ten_minutes&scenario=empty`);
    expect(shots.hourly_slots).toEqual([]);
  });

  it("POST /api/__reset regenerates the store", async () => {
    const res = await reset();
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("ok");
  });
});

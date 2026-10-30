/**
 * Mock API "business logic": turns the day records in the store into the exact
 * response shapes the TimeWorks Dashboard expects. One exported function per endpoint.
 */
import dayjs from "dayjs";
import type {
  AppUsageAllResponse,
  AppUsageItem,
  EmployeeCurrent,
  EmployeeSummaryResponse,
  GraphDataResponse,
  LimitRow,
  LowActivityUser,
  ManagerCurrent,
  ManagerSecondaryResponse,
  ManagerSummaryResponse,
  MemberActivity,
  MemberOption,
  Paged,
  PermissionEntry,
  ProjectClientRow,
  ProjectOption,
  ProjectReportItem,
  SidebarItem,
  TopEmployee,
  UserDetails,
} from "@/lib/api-types";
import { secondsToHM, secondsToHMS } from "@/lib/format";
import { DEMO_USER_ID, MEMBERS, MOCK_SETTINGS, ORGANIZATION, PROJECTS, type SeedMember } from "./seed";
import { getStore, hashString, rng, type DayRecord } from "./store";

export type Scenario = "default" | "empty";

export interface Ctx {
  scenario: Scenario;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const memberById = (id: string) => MEMBERS.find((m) => m.user_id === id);
const projectById = (id: string) => PROJECTS.find((p) => p.id === id);

/* ------------------------------------------------------------------ */
/* Range helpers                                                       */
/* ------------------------------------------------------------------ */

export function defaultRange() {
  return { start: dayjs().subtract(30, "day").format("YYYY-MM-DD"), end: dayjs().format("YYYY-MM-DD") };
}

function daysBetween(start: string, end: string) {
  const out: string[] = [];
  let d = dayjs(start);
  const e = dayjs(end);
  for (let i = 0; d.isBefore(e) || d.isSame(e, "day"); i++) {
    out.push(d.format("YYYY-MM-DD"));
    d = d.add(1, "day");
    if (i > 800) break;
  }
  return out;
}

function recordsFor(ctx: Ctx, userId: string, start: string, end: string): DayRecord[] {
  if (ctx.scenario === "empty") return [];
  const byDate = getStore().records.get(userId);
  if (!byDate) return [];
  return daysBetween(start, end)
    .map((d) => byDate.get(d))
    .filter((r): r is DayRecord => !!r);
}

interface Totals {
  regular: number;
  pto: number;
  activityWeighted: number;
  projectIds: Set<string>;
  pay: number;
  ptoPay: number;
  bill: number;
  ptoBill: number;
}

function totalsFor(ctx: Ctx, member: SeedMember, start: string, end: string): Totals {
  const t: Totals = { regular: 0, pto: 0, activityWeighted: 0, projectIds: new Set(), pay: 0, ptoPay: 0, bill: 0, ptoBill: 0 };
  for (const r of recordsFor(ctx, member.user_id, start, end)) {
    t.regular += r.regularSeconds;
    t.pto += r.ptoSeconds;
    t.activityWeighted += r.activity * r.regularSeconds;
    r.entries.forEach((e) => t.projectIds.add(e.projectId));
  }
  t.pay = (t.regular / 3600) * member.payRate;
  t.ptoPay = (t.pto / 3600) * member.payRate;
  t.bill = (t.regular / 3600) * member.billRate;
  t.ptoBill = 0;
  return t;
}

function activityOf(t: { regular: number; activityWeighted: number }) {
  return t.regular > 0 ? round2(t.activityWeighted / t.regular) : 0;
}

function employeeCurrent(t: Totals): EmployeeCurrent {
  const total = t.regular + t.pto;
  return {
    total_work_seconds: total,
    project_count: t.projectIds.size,
    activity_percentage: activityOf(t),
    total_pay_amount: round2(t.pay + t.ptoPay),
    total_regular_seconds: t.regular,
    total_regular_time: secondsToHMS(t.regular),
    total_regular_hours: round2(t.regular / 3600),
    total_pto_seconds: t.pto,
    total_pto_hours: secondsToHMS(t.pto),
    total_worked_time: secondsToHMS(total),
    total_hours: round2(total / 3600),
    total_pay_regular_amount: round2(t.pay),
    pto_pay_amount: round2(t.ptoPay),
  };
}

function managerCurrent(t: Totals): ManagerCurrent {
  return {
    ...employeeCurrent(t),
    total_bill_amount: round2(t.bill + t.ptoBill),
    total_profit: round2(t.bill + t.ptoBill - t.pay - t.ptoPay),
    total_bill_regular_amount: round2(t.bill),
    pto_billable_amount: round2(t.ptoBill),
  };
}

function sumTotals(list: Totals[]): Totals {
  const out: Totals = { regular: 0, pto: 0, activityWeighted: 0, projectIds: new Set(), pay: 0, ptoPay: 0, bill: 0, ptoBill: 0 };
  for (const t of list) {
    out.regular += t.regular;
    out.pto += t.pto;
    out.activityWeighted += t.activityWeighted;
    out.pay += t.pay;
    out.ptoPay += t.ptoPay;
    out.bill += t.bill;
    out.ptoBill += t.ptoBill;
    t.projectIds.forEach((p) => out.projectIds.add(p));
  }
  return out;
}

function paginate<T>(rows: T[], limit: number, offset: number): Paged<T> {
  return { data: rows.slice(offset, offset + limit), total_count: rows.length };
}

const matches = (text: string | null | undefined, search?: string) => !search || (text ?? "").toLowerCase().includes(search.toLowerCase());

/* ------------------------------------------------------------------ */
/* User / permissions                                                  */
/* ------------------------------------------------------------------ */

const TIMEZONE = {
  id: 151,
  name: "America/New_York",
  alternative_name: "Eastern Time",
  continent_code: "NA",
  continent_name: "North America",
  country_name: "United States",
  country_code: "US",
  raw_offset_in_minutes: -300,
  abbreviation: "EST",
};

export function userDetails(): UserDetails {
  const me = memberById(DEMO_USER_ID)!;
  return {
    user_id: me.user_id,
    email: me.email,
    full_name: me.full_name,
    user_time_zone: ORGANIZATION.time_zone,
    timezone: TIMEZONE,
    current_organization_id: ORGANIZATION.organization_id,
    is_2fa_enabled: false,
    profile_image_url: me.profile_image_url,
    role: { name: me.role, slug: me.role.toLowerCase() },
    organizations: [
      {
        organization_id: ORGANIZATION.organization_id,
        organization_name: ORGANIZATION.organization_name,
        organization_time_zone: ORGANIZATION.time_zone,
        timezone: TIMEZONE,
      },
    ],
  };
}

/** Sidebar tree (same slugs as the live app; the frontend maps slugs -> icons & URLs). */
export function sidebarPermissions(): SidebarItem[] {
  const page = (slug: string, name: string) => ({ id: `pg-${slug}`, name, slug, url: null, read_permission: true, write_permission: true });
  const item = (slug: string, name: string, children: SidebarItem[] = []): SidebarItem => ({
    id: `nav-${slug}`,
    name,
    slug,
    url: null,
    children,
    pages: [page(slug, name)],
  });
  // Names / order / nesting exactly as the live sidebar DOM (hidden slugs such as timesheet_approvals
  // and insights are returned by the live API too and filtered out by the frontend).
  return [
    item("dashboard", "Dashboard"),
    item("time_sheets", "Timesheets", [item("timesheet_view_edit", "View & Edit Timesheets"), item("timesheet_approvals", "Approvals")]),
    item("activity", "Activity", [item("screenshots", "Screenshots"), item("app", "App"), item("urls", "URLs"), item("deleted_screenshots", "Deleted Screenshots")]),
    item("calendar", "Calendar", [item("timeoff_request", "Timeoff Requests"), item("schedules", "Schedules")]),
    item("absence_leave", "Absence & Leave", [
      item("leave_calendar", "Calendar"),
      item("leave_requests", "Requests"),
      item("timeoff_balances", "Balances"),
      item("timeof_policies", "Policies"),
    ]),
    item("project_managements", "Project Management", [item("projects", "Projects"), item("to_dos", "To Dos")]),
    item("people", "People", [item("members", "Members"), item("client", "Client"), item("teams", "Teams")]),
    item("reports", "Reports", [
      item("time_activity", "Time & activity"),
      item("daily_totals_weekly", "Daily Total (weekly)"),
      item("time_edit", "Time Edits"),
      item("work_sessions", "Work Sessions"),
      item("app_and_urls", "Apps & Urls"),
      item("shift_attendance", "Shift Attendance"),
      item("daily_limits", "Daily Limits"),
      item("weekly_limits", "Weekly Limits"),
    ]),
    item("insights", "Insights"),
    item("financials", "Financials", [
      item("approvals", "Approvals"),
      item("payment_list", "Payments"),
      item("past_payments", "Past Payments"),
      item("client_billing", "Client Billing"),
    ]),
    item("settings", "Settings", [
      item("organization", "Organization", [
        item("roles", "Roles"),
        item("team-permission-settings", "Team Permissions"),
        item("audit_log", "Audit Logs"),
        item("security_login", "Security & Login"),
        item("fraud_detection", "Fraud Detection"),
      ]),
      item("employees", "Employees", [item("time_work_limit", "Time & Work Limits"), item("tracking_rules", "Tracking Rules"), item("hippa_compilance", "HIPPA compliance")]),
    ]),
  ];
}

export function userPermissions(): PermissionEntry[] {
  const slugs = ["dashboard", "team-dashboard", "time_sheets", "activity", "screenshots", "reports", "financials", "people", "settings"];
  return slugs.map((slug) => ({ slug, permissions: { [slug]: true, "team-dashboard": true } }));
}

export function allProjects(userId?: string | null): ProjectOption[] {
  const member = userId ? memberById(userId) : undefined;
  return PROJECTS.filter((p) => !member || member.projects.includes(p.id)).map((p) => ({ id: p.id, name: p.name }));
}

export function allMembers(): MemberOption[] {
  return MEMBERS.map((m) => ({ user_id: m.user_id, full_name: m.full_name, email: m.email, profile_image_url: m.profile_image_url }));
}

/* ------------------------------------------------------------------ */
/* My Dashboard (type=employee)                                        */
/* ------------------------------------------------------------------ */

function projectTaskRows(ctx: Ctx, userId: string, start: string, end: string): ProjectReportItem[] {
  const map = new Map<string, { project: string; task: string; seconds: number; weighted: number }>();
  for (const r of recordsFor(ctx, userId, start, end)) {
    for (const e of r.entries) {
      const key = `${e.projectId}|${e.task}`;
      const row = map.get(key) ?? { project: projectById(e.projectId)?.name ?? e.projectId, task: e.task, seconds: 0, weighted: 0 };
      row.seconds += e.seconds;
      row.weighted += e.seconds * e.activity;
      map.set(key, row);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.seconds - a.seconds)
    .map((r) => ({
      project_name: r.project,
      task_name: r.task,
      avg_activity_percentage: r.seconds ? round2(r.weighted / r.seconds) : 0,
      total_work: secondsToHMS(r.seconds),
    }));
}

function appUsageRows(ctx: Ctx, userId: string, start: string, end: string) {
  const map = new Map<string, { name: string; type: "app" | "url"; seconds: number }>();
  for (const r of recordsFor(ctx, userId, start, end)) {
    for (const a of r.apps) {
      const row = map.get(a.name) ?? { name: a.name, type: a.type, seconds: 0 };
      row.seconds += a.seconds;
      map.set(a.name, row);
    }
  }
  const rows = [...map.values()].sort((a, b) => b.seconds - a.seconds);
  const toItems = (list: typeof rows): AppUsageItem[] => {
    const total = list.reduce((s, r) => s + r.seconds, 0) || 1;
    return list.map((r) => ({
      application_name: r.name,
      type: r.type,
      activity_percentage: round2((r.seconds / total) * 100),
      total_time_spent: secondsToHMS(r.seconds),
    }));
  };
  return {
    all: toItems(rows),
    apps: toItems(rows.filter((r) => r.type === "app")),
    urls: toItems(rows.filter((r) => r.type === "url")),
  };
}

export function employeeSummary(ctx: Ctx, start: string, end: string, userId = DEMO_USER_ID): EmployeeSummaryResponse {
  const me = memberById(userId)!;
  const usage = appUsageRows(ctx, userId, start, end);
  const TOP = 5; // the dashboard card shows the top 5; "View All" uses app-usage-all
  return {
    data: { current: employeeCurrent(totalsFor(ctx, me, start, end)) },
    projects_report: projectTaskRows(ctx, userId, start, end).slice(0, TOP),
    application_usage_report: { all: usage.all.slice(0, TOP), apps: usage.apps.slice(0, TOP), urls: usage.urls.slice(0, TOP) },
  };
}

export function appUsageAll(ctx: Ctx, q: { start: string; end: string; limit: number; offset: number; search?: string }): AppUsageAllResponse {
  const usage = appUsageRows(ctx, DEMO_USER_ID, q.start, q.end);
  const f = (rows: AppUsageItem[]) => paginate(rows.filter((r) => matches(r.application_name, q.search)), q.limit, q.offset);
  return { all: f(usage.all), apps: f(usage.apps), urls: f(usage.urls) };
}

export function projectsTasksAll(ctx: Ctx, q: { start: string; end: string; limit: number; offset: number; search?: string; projectId?: string }): Paged<ProjectReportItem> {
  const projectName = q.projectId ? projectById(q.projectId)?.name : undefined;
  const rows = projectTaskRows(ctx, DEMO_USER_ID, q.start, q.end)
    .filter((r) => !projectName || r.project_name === projectName)
    .filter((r) => matches(`${r.project_name} ${r.task_name}`, q.search));
  return paginate(rows, q.limit, q.offset);
}

/* ------------------------------------------------------------------ */
/* Manager View (type=manager)                                         */
/* ------------------------------------------------------------------ */

function topEmployeeRow(ctx: Ctx, m: SeedMember, start: string, end: string): TopEmployee {
  const t = totalsFor(ctx, m, start, end);
  const c = managerCurrent(t);
  return {
    user_id: m.user_id,
    member_name: m.full_name,
    email: m.email,
    profile_image_url: m.profile_image_url,
    total_hours: c.total_hours,
    total_worked_time: c.total_worked_time,
    total_regular_seconds: c.total_regular_seconds,
    total_regular_time: c.total_regular_time,
    total_regular_hours: c.total_regular_hours,
    total_pto_seconds: c.total_pto_seconds,
    total_pto_hours: c.total_pto_hours,
    project_count: c.project_count,
    activity_percentage: c.activity_percentage,
    total_pay_regular_amount: c.total_pay_regular_amount,
    pto_pay_amount: c.pto_pay_amount,
    total_pay_amount: c.total_pay_amount,
    total_bill_regular_amount: c.total_bill_regular_amount,
    pto_billable_amount: c.pto_billable_amount,
    total_bill_amount: c.total_bill_amount,
    total_profit: c.total_profit,
  };
}

function topEmployees(ctx: Ctx, start: string, end: string) {
  return MEMBERS.map((m) => topEmployeeRow(ctx, m, start, end))
    .filter((r) => r.total_hours > 0)
    .sort((a, b) => b.total_hours - a.total_hours);
}

function projectClientRows(ctx: Ctx, start: string, end: string, filterUserId?: string): ProjectClientRow[] {
  const map = new Map<string, { seconds: number; bill: number }>();
  for (const m of MEMBERS) {
    if (filterUserId && m.user_id !== filterUserId) continue;
    for (const r of recordsFor(ctx, m.user_id, start, end)) {
      for (const e of r.entries) {
        const row = map.get(e.projectId) ?? { seconds: 0, bill: 0 };
        row.seconds += e.seconds;
        row.bill += (e.seconds / 3600) * m.billRate;
        map.set(e.projectId, row);
      }
    }
  }
  return [...map.entries()]
    .map(([id, v]) => {
      const p = projectById(id)!;
      return {
        project_id: p.id,
        project_name: p.name,
        client_name: p.client ?? "",
        total_hours: round2(v.seconds / 3600),
        total_worked_time: secondsToHMS(v.seconds),
        total_bill_amount: round2(v.bill),
      };
    })
    .sort((a, b) => b.total_hours - a.total_hours);
}

export function managerSummary(ctx: Ctx, start: string, end: string): ManagerSummaryResponse {
  const company = sumTotals(MEMBERS.map((m) => totalsFor(ctx, m, start, end)));
  return {
    data: { current: managerCurrent(company) },
    low_activity_users: [],
    graph_data: {},
    top_employee_data: topEmployees(ctx, start, end).slice(0, 5),
    projects: projectClientRows(ctx, start, end).slice(0, 6),
    members_activity: [],
    weekly_limits: [],
    daily_limits: [],
  };
}

export function graphData(ctx: Ctx, start: string, end: string): GraphDataResponse {
  return {
    graph_data: daysBetween(start, end).map((date) => {
      let regular = 0;
      let pto = 0;
      let weighted = 0;
      let bill = 0;
      for (const m of MEMBERS) {
        const r = ctx.scenario === "empty" ? undefined : getStore().records.get(m.user_id)?.get(date);
        if (!r) continue;
        regular += r.regularSeconds;
        pto += r.ptoSeconds;
        weighted += r.activity * r.regularSeconds;
        bill += (r.regularSeconds / 3600) * m.billRate;
      }
      return {
        label: date,
        total_worked_time: secondsToHMS(regular + pto),
        regular_worked: round2(regular / 3600),
        pto_hours: round2(pto / 3600),
        time_worked: round2((regular + pto) / 3600),
        regular_bill: round2(bill),
        pto_billable: 0,
        bills: round2(bill),
        activity: regular ? round2(weighted / regular) : 0,
      };
    }),
  };
}

/* ---------- "secondary" widgets: low activity, members, limits ---------- */

function lowActivityRows(ctx: Ctx, start: string, end: string): LowActivityUser[] {
  return MEMBERS.map((m) => ({ m, t: totalsFor(ctx, m, start, end) }))
    .filter(({ t }) => t.regular > 0 && activityOf(t) < MOCK_SETTINGS.lowActivityThreshold)
    .sort((a, b) => activityOf(a.t) - activityOf(b.t))
    .map(({ m, t }) => ({
      user_id: m.user_id,
      member_name: m.full_name,
      worked_time: secondsToHMS(t.regular),
      activity_percentage: activityOf(t),
      profile_image_url: m.profile_image_url,
    }));
}

function secondsOn(ctx: Ctx, userId: string, start: string, end: string) {
  return recordsFor(ctx, userId, start, end).reduce((s, r) => s + r.regularSeconds, 0);
}

function weekStart() {
  // Monday of the current week
  const d = dayjs();
  return d.subtract((d.day() + 6) % 7, "day").format("YYYY-MM-DD");
}

function lastActiveLabel(ctx: Ctx, m: SeedMember): string | null {
  if (ctx.scenario === "empty") return null;
  const byDate = getStore().records.get(m.user_id);
  for (let d = 0; d <= MOCK_SETTINGS.historyDays; d++) {
    const date = dayjs().subtract(d, "day").format("YYYY-MM-DD");
    const r = byDate?.get(date);
    if (r && r.regularSeconds > 0) {
      if (d === 0) return "Today";
      if (d === 1) return "Yesterday";
      if (d < 30) return `${d} days ago`;
      const months = Math.round(d / 30);
      return months <= 1 ? "1 month ago" : `${months} months ago`;
    }
  }
  return null;
}

function membersActivityRows(ctx: Ctx): MemberActivity[] {
  const today = dayjs().format("YYYY-MM-DD");
  return MEMBERS.map((m) => {
    const todaySec = secondsOn(ctx, m.user_id, today, today);
    const weekSec = secondsOn(ctx, m.user_id, weekStart(), today);
    return {
      row: {
        user_id: m.user_id,
        full_name: m.full_name,
        email: m.email,
        profile_image_url: m.profile_image_url,
        today_tracked: secondsToHM(todaySec, false),
        this_week_tracked: secondsToHM(weekSec, false),
        last_active: lastActiveLabel(ctx, m),
        organization_name: ORGANIZATION.organization_name,
      },
      todaySec,
      weekSec,
    };
  })
    .sort((a, b) => b.todaySec - a.todaySec || b.weekSec - a.weekSec)
    .map((x) => x.row);
}

function limitRows(ctx: Ctx, kind: "weekly" | "daily"): LimitRow[] {
  const today = dayjs().format("YYYY-MM-DD");
  return MEMBERS.map((m) => {
    const used = kind === "weekly" ? secondsOn(ctx, m.user_id, weekStart(), today) : secondsOn(ctx, m.user_id, today, today);
    const limit = (kind === "weekly" ? m.weeklyLimitHours : m.dailyLimitHours) * 3600;
    return {
      user_id: m.user_id,
      full_name: m.full_name,
      email: m.email,
      profile_image_url: m.profile_image_url,
      used_time: secondsToHM(used),
      used_seconds: used,
      total_limit: secondsToHM(limit),
      limit_seconds: limit,
      progress_percentage: limit > 0 ? round2((used / limit) * 100) : 0,
    };
  }).sort((a, b) => b.used_seconds - a.used_seconds);
}

export function managerSecondary(ctx: Ctx, start: string, end: string): ManagerSecondaryResponse {
  const strip = (rows: LimitRow[]) => rows.map(({ progress_percentage: _p, ...rest }) => rest);
  return {
    low_activity_users: lowActivityRows(ctx, start, end).slice(0, 5),
    members_activity: membersActivityRows(ctx)
      .slice(0, 6)
      .map(({ organization_name: _o, ...rest }) => rest),
    weekly_limits: strip(limitRows(ctx, "weekly").slice(0, 6)),
    daily_limits: strip(limitRows(ctx, "daily").slice(0, 6)),
  };
}

/* ---------- "View All" lists for the Manager View ---------- */

interface ListQ {
  start: string;
  end: string;
  limit: number;
  offset: number;
  search?: string;
  filterUserId?: string;
}

const byUser = (filterUserId?: string) => (r: { user_id: string }) => !filterUserId || r.user_id === filterUserId;

export function projectsClientsAll(ctx: Ctx, q: ListQ) {
  const rows = projectClientRows(ctx, q.start, q.end, q.filterUserId).filter((r) => matches(`${r.project_name} ${r.client_name}`, q.search));
  return paginate(rows, q.limit, q.offset);
}

export function topEmployeesAll(ctx: Ctx, q: ListQ) {
  const rows = topEmployees(ctx, q.start, q.end).filter(byUser(q.filterUserId)).filter((r) => matches(r.member_name, q.search));
  return paginate(rows, q.limit, q.offset);
}

export function lowActivityAll(ctx: Ctx, q: ListQ) {
  const rows = lowActivityRows(ctx, q.start, q.end).filter(byUser(q.filterUserId)).filter((r) => matches(r.member_name, q.search));
  return paginate(rows, q.limit, q.offset);
}

export function membersActivityAll(ctx: Ctx, q: ListQ) {
  const rows = membersActivityRows(ctx).filter(byUser(q.filterUserId)).filter((r) => matches(r.full_name, q.search));
  return paginate(rows, q.limit, q.offset);
}

export function limitsAll(ctx: Ctx, kind: "weekly" | "daily", q: Omit<ListQ, "start" | "end">) {
  const rows = limitRows(ctx, kind).filter(byUser(q.filterUserId)).filter((r) => matches(r.full_name, q.search));
  return paginate(rows, q.limit, q.offset);
}

// Recent Screenshots / Activity › Screenshots: see src/mock/screenshots.ts

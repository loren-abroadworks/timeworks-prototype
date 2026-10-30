import * as React from "react";
import {
  BadgeDollarSign,
  Briefcase,
  CalendarRange,
  ChartPie,
  Clock,
  LayoutDashboard,
  Settings,
  ShieldPlus,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type { SidebarItem } from "@/lib/api-types";

/**
 * Sidebar configuration: maps the slugs returned by GET /user-permission/{org}
 * to icons, URLs and order — same tables as the live app.
 */

/** Custom "absence & leave" (beach umbrella) icon from the live app. */
export function UmbrellaIcon({ size = 18 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 28 25" fill="currentColor" className="">
      <path d="M22.925 4.59925C25.2 6.79161 26.4347 9.89786 26.2451 13.0916L22.05 11.5652C22.7889 9.46522 23.1 7.23883 22.9687 5.01245C22.959 4.87147 22.9444 4.73536 22.925 4.59925ZM19.5806 2.40689C20.6354 2.89786 21.3451 3.93328 21.4132 5.10967C21.5347 7.12217 21.2528 9.13467 20.5868 11.0354L12.4396 8.07008C13.1493 6.18397 14.2333 4.46314 15.6139 2.99995C16.4646 2.10064 17.7576 1.77495 18.9292 2.15897C18.9826 2.17842 19.0361 2.19786 19.0896 2.21731C19.2549 2.27564 19.4153 2.33883 19.5757 2.40689H19.5806ZM19.4299 0.686056C14.0924 -1.16117 8.32708 0.841611 5.20625 5.2555C4.66667 6.0187 5.07014 7.04439 5.95 7.36522L10.4417 8.99856L11.9097 9.53328L20.0569 12.4986L21.5201 13.0284L25.8514 14.6034C26.7312 14.9243 27.6986 14.3993 27.7764 13.4659C28.2139 8.21106 25.2486 3.10203 20.2125 0.977723C20.0958 0.924251 19.9743 0.87564 19.8528 0.83189L19.566 0.729806C19.5222 0.715223 19.4785 0.700639 19.4347 0.686056H19.4299ZM14.8701 1.56592C14.7389 1.67772 14.6076 1.79925 14.4861 1.9305C12.9549 3.54925 11.7639 5.45481 10.9764 7.54022L6.62083 5.9555C8.57986 3.31592 11.6278 1.71661 14.8701 1.56592ZM0.777778 23.1006C0.35 23.1006 0 23.4506 0 23.8784C0 24.3062 0.35 24.6562 0.777778 24.6562H27.2222C27.65 24.6562 28 24.3062 28 23.8784C28 23.4506 27.65 23.1006 27.2222 23.1006H12.3181L16.1 12.7124L14.6368 12.1826L10.6653 23.1006H0.777778Z" />
    </svg>
  );
}

export const NAV_ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard size={18} />,
  time_sheets: <Clock size={18} />,
  activity: <TrendingUp size={18} />,
  calendar: <CalendarRange size={18} />,
  absence_leave: <UmbrellaIcon size={18} />,
  project_managements: <Briefcase size={18} />,
  people: <Users size={18} />,
  reports: <ChartPie size={18} />,
  insights: <Sparkles size={18} />,
  financials: <BadgeDollarSign size={18} />,
  settings: <Settings size={18} />,
  hippa_compilance: <ShieldPlus size={18} />,
};

/** Hidden in the live sidebar. */
const HIDDEN = ["timesheet_approvals", "insights", "amount_owed", "payments", "all_report", "timeline_activities"];

const ORDER: Record<string, number> = {
  dashboard: 1,
  time_sheets: 2,
  activity: 3,
  calendar: 4,
  absence_leave: 5,
  project_managements: 6,
  people: 7,
  reports: 8,
  insights: 9,
  financials: 10,
  settings: 11,
};

function hrefFor(slug: string, userId: string, org: number | string, parent?: string) {
  const a = org;
  const leave: Record<string, string> = {
    leave_calendar: `/organizations/${a}/absence_leave/calendar`,
    leave_requests: `/organizations/${a}/absence_leave/requests`,
    timeoff_request: `/organizations/${a}/absence_leave/requests`,
    timeoff_balances: `/organizations/${a}/absence_leave/balances`,
    timeof_policies: `/organizations/${a}/absence_leave/policies`,
  };
  const map: Record<string, string> = {
    dashboard: `/dashboard/${userId}/my_dashboard`,
    screenshots: `/organizations/${a}/activities/screenshots`,
    deleted_screenshots: `/organizations/${a}/activities/deleted_screenshots`,
    app: `/organizations/${a}/activities/apps`,
    urls: `/organizations/${a}/activities/urls`,
    timesheet_view_edit: `/organizations/${a}/timesheets/view_edit`,
    members: `/organizations/${a}/members`,
    client: `/organizations/${a}/clients`,
    teams: `/organizations/${a}/teams`,
    projects: `/organizations/${a}/projects`,
    to_dos: `/organizations/${a}/to_dos`,
    time_activity: `/reports/${userId}/time_activities`,
    daily_totals_weekly: `/reports/${userId}/daily`,
    time_edit: `/reports/${userId}/time_edits`,
    work_sessions: `/reports/${userId}/work_sessions`,
    app_and_urls: `/organizations/${a}/reports/apps_urls_report`,
    shift_attendance: `/organizations/${a}/reports/shift_attendance_report`,
    daily_limits: `/organizations/${a}/reports/daily_limits_report`,
    weekly_limits: `/organizations/${a}/reports/weekly_limits_report`,
    roles: `/organizations/${a}/settings/organization/roles`,
    fraud_detection: `/organizations/${a}/settings/organization/fraud_detection`,
    audit_log: `/organizations/${a}/settings/organization/audit_logs`,
    security_login: `/organizations/${a}/settings/organization/security`,
    "team-permission-settings": `/organizations/${a}/settings/organization/team_permissions`,
    time_work_limit: `/organizations/${a}/settings/employee/time_work_limits`,
    tracking_rules: `/organizations/${a}/settings/employee/tracking_rules`,
    hippa_compilance: `/organizations/${a}/settings/employee/hipaa_compliance`,
    timeof_policies: `/organizations/${a}/settings/employee/timeoff_policies`,
    teams_clients: `/organizations/${a}/settings/teams-clients`,
    approvals: `/organizations/${a}/financials/approvals`,
    payment_list: `/organizations/${a}/financials/payments`,
    past_payments: `/organizations/${a}/financials/past_payments`,
    client_billing: `/organizations/${a}/financials/client_billing`,
    payment_history: `/organizations/${a}/financials/payment_history`,
    billing: `/organizations/${a}/settings/organization/billing`,
    schedules: `/organizations/${a}/calendar/schedules`,
    timeoff_request: `/organizations/${a}/timeoff/requests`,
    activity_and_tracking: `/organizations/${a}/settings/employee/tracking_rules`,
    policies: `/organizations/${a}/settings/employee/timeoff_policies`,
  };
  return (parent === "absence_leave" ? leave[slug] : undefined) ?? map[slug] ?? "";
}

export interface NavItem {
  id: string;
  name: string;
  slug: string;
  icon?: React.ReactNode;
  href: string;
  children: NavItem[];
}

export function buildNav(items: SidebarItem[], userId: string, org: number | string, parent?: string): NavItem[] {
  return items
    .filter((i) => !HIDDEN.includes(i.slug))
    .map((i) => ({
      id: i.id,
      name: i.name,
      slug: i.slug,
      icon: NAV_ICONS[i.slug],
      href: hrefFor(i.slug, userId, org, parent),
      children: buildNav(i.children ?? [], userId, org, i.slug),
    }))
    .sort((a, b) => (parent ? 0 : (ORDER[a.slug] ?? 999) - (ORDER[b.slug] ?? 999)));
}

/**
 * Response types of the TimeWorks API as used by the Dashboard.
 * The mock API (src/mock) returns exactly these shapes; tests/api-contract.test.ts asserts them.
 */

export interface Timezone {
  id: number;
  name: string;
  alternative_name: string;
  continent_code: string;
  continent_name: string;
  country_name: string;
  country_code: string;
  raw_offset_in_minutes: number;
  abbreviation: string;
}

export interface UserDetails {
  user_id: string;
  email: string;
  full_name: string;
  user_time_zone: string;
  timezone: Timezone;
  current_organization_id: number;
  is_2fa_enabled: boolean;
  profile_image_url: string | null;
  role: { name: string; slug: string };
  organizations: { organization_id: number; organization_name: string; organization_time_zone: string; timezone: Timezone }[];
}

export interface SidebarPage {
  id: string;
  name: string;
  slug: string;
  url: string | null;
  read_permission: boolean;
  write_permission: boolean;
}

export interface SidebarItem {
  id: string;
  name: string;
  slug: string;
  url: string | null;
  children: SidebarItem[];
  pages: SidebarPage[];
}

export interface PermissionEntry {
  slug: string;
  permissions: Record<string, boolean>;
}

export interface EmployeeCurrent {
  total_work_seconds: number;
  project_count: number;
  activity_percentage: number;
  total_pay_amount: number;
  total_regular_seconds: number;
  total_regular_time: string;
  total_regular_hours: number;
  total_pto_seconds: number;
  total_pto_hours: string;
  total_worked_time: string;
  total_hours: number;
  total_pay_regular_amount: number;
  pto_pay_amount: number;
}

export interface ManagerCurrent extends EmployeeCurrent {
  total_bill_amount: number;
  total_profit: number;
  total_bill_regular_amount: number;
  pto_billable_amount: number;
}

export interface ProjectReportItem {
  project_name: string;
  task_name: string | null;
  avg_activity_percentage: number;
  total_work: string;
}

export interface AppUsageItem {
  application_name: string;
  type: "app" | "url";
  activity_percentage: number;
  total_time_spent: string;
}

export interface AppUsageReport {
  all: AppUsageItem[];
  apps: AppUsageItem[];
  urls: AppUsageItem[];
}

export interface EmployeeSummaryResponse {
  data: { current: EmployeeCurrent };
  projects_report: ProjectReportItem[];
  application_usage_report: AppUsageReport;
}

export interface TopEmployee {
  user_id: string;
  member_name: string;
  email: string;
  profile_image_url: string | null;
  total_hours: number;
  total_worked_time: string;
  total_regular_seconds: number;
  total_regular_time: string;
  total_regular_hours: number;
  total_pto_seconds: number;
  total_pto_hours: string;
  project_count: number;
  activity_percentage: number;
  total_pay_regular_amount: number;
  pto_pay_amount: number;
  total_pay_amount: number;
  total_bill_regular_amount: number;
  pto_billable_amount: number;
  total_bill_amount: number;
  total_profit: number;
}

export interface ProjectClientRow {
  project_id: string;
  project_name: string;
  client_name: string;
  total_hours: number;
  total_worked_time: string;
  total_bill_amount: number;
}

export interface LowActivityUser {
  user_id: string;
  member_name: string;
  worked_time: string;
  activity_percentage: number;
  profile_image_url: string | null;
}

export interface MemberActivity {
  user_id: string;
  full_name: string;
  email: string;
  profile_image_url: string | null;
  today_tracked: string;
  this_week_tracked: string;
  last_active: string | null;
  organization_name?: string;
}

export interface LimitRow {
  user_id: string;
  full_name: string;
  email: string;
  profile_image_url: string | null;
  used_time: string;
  used_seconds: number;
  total_limit: string;
  limit_seconds: number;
  progress_percentage?: number;
}

export interface ManagerSummaryResponse {
  data: { current: ManagerCurrent };
  low_activity_users: LowActivityUser[];
  graph_data: Record<string, never>;
  top_employee_data: TopEmployee[];
  projects: ProjectClientRow[];
  members_activity: MemberActivity[];
  weekly_limits: LimitRow[];
  daily_limits: LimitRow[];
}

export interface GraphPoint {
  label: string;
  total_worked_time: string;
  regular_worked: number;
  pto_hours: number;
  time_worked: number;
  regular_bill: number;
  pto_billable: number;
  bills: number;
  activity: number;
}

export interface GraphDataResponse {
  graph_data: GraphPoint[];
}

export interface ManagerSecondaryResponse {
  low_activity_users: LowActivityUser[];
  members_activity: MemberActivity[];
  weekly_limits: LimitRow[];
  daily_limits: LimitRow[];
}

export interface Paged<T> {
  data: T[];
  total_count: number;
}

export interface AppUsageAllResponse {
  all: Paged<AppUsageItem>;
  apps: Paged<AppUsageItem>;
  urls: Paged<AppUsageItem>;
}

export interface Screenshot {
  id: number;
  url: string;
  project: string | null;
}

export interface TenMinuteSlot {
  time_slot: string;
  activity_percentage: number;
  screenshots: Screenshot[];
}

export interface HourlySlot {
  hour_slot: string;
  ten_minute_slots: TenMinuteSlot[];
}

export interface HourlyBucket {
  hour_slot: string;
  screenshots: (Screenshot & { captured_at_user_tz: string })[];
}

export interface ScreenshotsResponse {
  status: string;
  is_work_screenshot_block_delete: boolean;
  date: string;
  total_hourly_slots: number;
  total_work: string;
  avg_activity_percentage: number;
  hourly_slots?: HourlySlot[];
  hourly_buckets?: HourlyBucket[];
  has_time_off: boolean;
  time_off: unknown[];
}

export interface ProjectOption {
  id: string;
  name: string;
}

export interface MemberOption {
  user_id: string;
  full_name: string;
  email: string;
  profile_image_url: string | null;
}

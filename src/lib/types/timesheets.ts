/**
 * Response types of GET /reports/user-time-sheet/{org}/{user} (React Query key ["list","USER_TIMESHEETS",…]).
 * Field names / formats follow the live API (captured QUERY SHAPES).
 */

export interface TimesheetEntry {
  org_name: string;
  project_id: string;
  project_name: string;
  client_name: string;
  task_id: string | null;
  task_name: string | null;
  duration_seconds: number;
  /** "0:09:34" */
  duration: string;
  activity_percentage: number;
  is_locked: boolean;
  is_manual: boolean;
  is_origin_manual: boolean | null;
  is_idle: boolean;
  is_paid: boolean;
  notes: string;
  /** Local time in the requested timezone_str, "2026-10-28T12:03:31". */
  started_at: string;
  stopped_at: string;
  is_running: boolean;
  created_by: string;
  /** Comma separated ids of the tracked blocks behind this row ("" for manual time). */
  local_activity_duration_id: string;
  client_local_id: string;
}

export interface TimesheetTimeOff {
  request_id: number;
  policy_id: number;
  policy_name: string;
  duration_state: string;
  duration_seconds: number;
  duration: string;
  is_paid: boolean;
  started_at: string;
  stopped_at: string;
}

export interface TimesheetDay {
  total_user_duration_seconds: number;
  total_user_duration: string;
  break_duration_second: number;
  user_break_duration: string;
  entries: TimesheetEntry[];
  time_off: TimesheetTimeOff[];
  day_time_off_seconds: number;
  day_time_off_time: string;
  day_time_off_paid_seconds: number;
  day_time_off_paid_time: string;
  day_time_off_unpaid_seconds: number;
  day_time_off_unpaid_time: string;
  regular_day_total_second: number;
  regular_day_total_time: string;
  day_total_duration_second: number;
  day_total_time: string;
  average_activity: number;
  average_activity_seconds: number;
}

export interface NamedRef<T = string> {
  id: T;
  name: string;
}

export interface TimesheetUser {
  user_id: string;
  name: string;
  email: string;
  profile_picture: string | null;
  role_name: string;
  start_date: string | null;
  timezone: string;
  clients: NamedRef<number>[];
  projects: NamedRef<string>[];
  teams: NamedRef<number>[];
  managers: { user_id: string; name: string; projects: NamedRef<string>[]; profile_picture: string | null }[];
}

export interface UserTimesheetResponse {
  user_id: string;
  organization_id: number;
  user: TimesheetUser;
  user_total_spent: string;
  regular_total_spent: string;
  pto_time_spend: string;
  user_average_activity: string;
  report: Record<string, TimesheetDay>;
  time_off_summary: {
    total_seconds: number;
    total_hours: string;
    paid_seconds: number;
    paid_hours: string;
    unpaid_seconds: number;
    unpaid_hours: string;
    days_count: number;
    policies_count: number;
  };
  limit: number;
  offset: number;
  total_dates: number;
}

export interface TaskOption {
  id: string;
  name: string;
}

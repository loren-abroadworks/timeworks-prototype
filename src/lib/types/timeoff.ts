/**
 * Time off (Calendar › Timeoff Requests, Absence & Leave) response types.
 * Shapes follow the live React Query cache ("QUERY SHAPES" in the batch 2 capture);
 * Balances / Audit Trail were not captured, their shapes are the replica's own.
 */

export type TimeOffStatus = "submitted" | "approved" | "denied";
export type LeaveType = "full_day" | "partial";
export type PolicyType = "none" | "annual" | "monthly" | "hours_worked" | "joined_date";
export type AccrualAnchor = "calendar_year" | "work_anniversary" | "policy_joined_date";

export interface TimeOffDetail {
  id: number;
  /** Naive local datetime in the request's timezone ("2026-10-29T09:00:00"). */
  started_at_datetime: string;
  stopped_at_datetime: string;
}

export interface TimeOffAttachment {
  id: number;
  file_name: string;
  file_size: number;
  content_type: string;
  url: string;
}

/** One row of GET /time-off/requests/{org}. */
export interface TimeOffRequest {
  id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  profile_image_url: string | null;
  started_at_date: string;
  stopped_at_date: string;
  notes: string;
  reason_notes: string | null;
  leave_type: LeaveType;
  time_off_policy_id: number;
  policy_name: string;
  status: TimeOffStatus;
  approved_by: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
  details: TimeOffDetail[];
  attachments: TimeOffAttachment[];
}

export interface TimeOffRequestsResponse {
  total: number;
  current_month_total: number;
  status_counts: { submitted: number; approved: number; denied: number };
  limit: number;
  offset: number;
  timezone: string;
  current_month: { start_date: string; end_date: string };
  items: TimeOffRequest[];
}

/** Month view: entries per date. */
export interface MonthViewEntry {
  id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  profile_image_url: string | null;
  status: TimeOffStatus;
  leave_type: LeaveType;
  time_off_policy_id: number;
  policy_name: string;
  started_at_date: string;
  stopped_at_date: string;
  is_start: boolean;
  is_end: boolean;
  duration_seconds: number | null;
  details: TimeOffDetail[];
  notes: string;
  reason_notes: string | null;
  approved_by: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
  attachment_count: number;
  attachments: TimeOffAttachment[];
}

export interface MonthViewResponse {
  timezone: string;
  range: { start_date: string; end_date: string };
  truncated: boolean;
  data: Record<string, MonthViewEntry[]>;
}

export interface WeekViewLeave {
  id: number;
  status: TimeOffStatus;
  leave_type: LeaveType;
  time_off_policy_id: number;
  policy_name: string;
  started_at_date: string;
  stopped_at_date: string;
  bar_start: boolean;
  visible_span_days: number;
  is_start: boolean;
  is_end: boolean;
  continues_before: boolean;
  continues_after: boolean;
  duration_seconds: number | null;
  details: TimeOffDetail[];
  notes: string;
  reason_notes: string | null;
  approved_by: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
  attachment_count: number;
  attachments: TimeOffAttachment[];
}

export interface WeekViewMember {
  user_id: string;
  full_name: string;
  email: string;
  profile_image_url: string | null;
  timezone: string;
  teams: { id: number; name: string }[];
  leaves: Record<string, WeekViewLeave[]>;
}

export interface WeekViewResponse {
  view: "week" | "month";
  range: { start_date: string; end_date: string };
  days: string[];
  timezone: string;
  total: number;
  limit: number;
  offset: number;
  truncated: boolean;
  items: WeekViewMember[];
}

export interface BalanceSummary {
  user_id: string;
  member_name: string;
  policy_id: number;
  policy_name: string;
  year: number;
  current_balance_in_second: number;
  this_request_in_second: number;
  pending_requests_in_second: number;
  remaining_balance_in_second: number;
  current_balance_hours: number;
  this_request_hours: number;
  pending_requests_hours: number;
  remaining_balance_hours: number;
  carryover_remaining_in_second: number | null;
  carryover_remaining_hours: number | null;
  carryover_expires_at: string | null;
}

export interface TenureTier {
  from_year: number;
  annual_hours: number;
}

/** Row of GET /time-off-policy/list/{org}. */
export interface TimeOffPolicy {
  id: number;
  name: string;
  policy_type: PolicyType;
  accrual_year_anchor: AccrualAnchor;
  auto_add_new_users: boolean;
  allow_negative_balances: boolean;
  max_negative_balance: number;
  balance_rolls_over_annually: boolean;
  requires_approval: boolean;
  paid: boolean;
  is_paid: boolean;
  client_id: number;
  client_name: string;
  is_billable: boolean;
  hours_per_year: number;
  starting_balance: number;
  accrual_per_month: number;
  accrual_day: "first_day_of_month" | "last_day_of_month" | "monthly_anniversary";
  allow_prorated: boolean;
  hours_worked_accrued: number;
  hours_worked_per_worked: number;
  users_count: number;
  created_at: string;
  updated_at: string;
  tenure_accrual_enabled: boolean;
  tenure_tiers: TenureTier[];
  tenure_increase_hours: number;
  tenure_increase_interval_years: number;
  tenure_max_annual_hours: number | null;
  rollover_cap: number | null;
  rollover_expiry_days: number | null;
}

export interface TimeOffPolicyList {
  total: number;
  limit: number;
  offset: number;
  data: TimeOffPolicy[];
  items: TimeOffPolicy[];
}

/** GET /time-off-policy/{org}/{id} — the list row plus its members. */
export interface TimeOffPolicyDetail extends TimeOffPolicy {
  assigned_users: { user_id: string; full_name: string; email: string }[];
}

/** Row of GET /user-time-off-policy/list/{org} (policies of the logged-in user). */
export interface UserTimeOffPolicy {
  id: number;
  name: string;
  policy_type: PolicyType;
  accrual_year_anchor: AccrualAnchor;
  auto_add_new_users: boolean;
  allow_negative_balances: boolean;
  max_negative_balance: number;
  requires_approval: boolean;
  paid: boolean;
  users_count: number;
  assigned_at: string;
  created_at: string;
  updated_at: string | null;
  tenure_accrual_enabled: boolean;
  tenure_tiers: TenureTier[];
  tenure_increase_hours: number;
  tenure_increase_interval_years: number;
  tenure_max_annual_hours: number | null;
  rollover_cap: number | null;
  rollover_expiry_days: number | null;
}

/* ---------- Balances / Audit Trail (replica shapes) ---------- */

export interface PolicyBalance {
  policy_id: number;
  policy_name: string;
  is_billable: boolean;
  is_paid: boolean;
  allow_negative_balances: boolean;
  balance_hours: number;
  accrued_hours: number;
  used_hours: number;
  pending_hours: number;
}

export interface BalanceRow {
  user_id: string;
  full_name: string;
  email: string;
  profile_image_url: string | null;
  clients: { id: number; name: string }[];
  projects: { id: string; name: string }[];
  teams: { id: number; name: string }[];
  policies: PolicyBalance[];
}

export interface BalancesResponse {
  total: number;
  limit: number;
  offset: number;
  items: BalanceRow[];
}

export interface AuditAdjustment {
  id: number;
  adjustment_hours: number;
  from_hours: number;
  to_hours: number;
  reason: string;
  adjusted_by: { user_id: string; full_name: string; profile_image_url: string | null };
  adjusted_on: string;
}

export interface AuditPolicy {
  policy_id: number;
  policy_name: string;
  accrued_hours: number;
  used_hours: number;
  remaining_hours: number;
  adjustments: AuditAdjustment[];
}

export interface AuditRow {
  user_id: string;
  full_name: string;
  email: string;
  profile_image_url: string | null;
  policy_count: number;
  policy_label: string;
  total_accrued_hours: number;
  total_used_hours: number;
  balance_remaining_hours: number;
  last_adjusted: string;
  policies: AuditPolicy[];
}

export interface AuditTrailResponse {
  total: number;
  limit: number;
  offset: number;
  start_date: string;
  end_date: string;
  items: AuditRow[];
}

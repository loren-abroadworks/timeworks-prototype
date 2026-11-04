/** Calendar › Schedules response types (shape of the live `["LIST","SCHEDULE_DATA",…]` query). */

export interface ShiftTimeOff {
  request_id: number;
  policy_name: string;
  status: "submitted" | "approved" | "denied";
  leave_type: "full_day" | "partial";
  is_paid: boolean;
  started_at: string;
  stopped_at: string;
}

export interface ShiftDay {
  source: "shift" | null;
  shift_rule_id: number | null;
  shift_type: "fixed" | "flexible" | "hybrid_flex" | null;
  flexible_type: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  start: string | null;
  end: string | null;
  time_offs: ShiftTimeOff[];
  minimum_hour_interval: string;
  shift_buffer_seconds: number | null;
  shift_buffer_interval: string | null;
  is_day_lock: boolean;
  is_time_lock: boolean;
  status: "active" | "inactive" | null;
  /** on-time | missed | late | abandoned | overtime | upcoming | null (today) */
  status_tag: string | null;
}

export interface ShiftMember {
  user_id: string;
  full_name: string;
  email: string;
  profile_image_url: string | null;
  timezone: string;
  shifts: Record<string, ShiftDay>;
}

export interface ShiftReportResponse {
  report_type: string;
  week_start: string;
  week_end: string;
  timezone: string;
  org_timezone: string;
  total: number;
  limit: number;
  offset: number;
  items: ShiftMember[];
}

export interface ShiftRuleOverview {
  user_id: string;
  user_name: string;
  shift_rules: { shift_name: string; effective_from: string; effective_to: string | null; status: string; shift_type: string }[];
}

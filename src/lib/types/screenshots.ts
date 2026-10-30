/**
 * Response types for Activity › Screenshots and Activity › Deleted Screenshots
 * (shapes copied from the live app's React Query cache, see the batch-1 capture).
 */

export interface FraudFlag {
  id: string;
  session_id: string | null;
  slot_id: string;
  time_entry_id: string | null;
  kind: string;
  evidence: Record<string, unknown>;
  os_source: string;
  policy_action: string;
  detected_at: string;
  created_at: string;
}

export interface ActivityShot {
  id: number;
  /** UTC, "2026-10-28T04:05:33" */
  captured_at: string;
  /** User zone, "2026-10-28 12:05:33 AM EDT" */
  captured_at_user_tz: string;
  url: string;
  path: string;
  is_hipaa_compliant: boolean;
  is_manual: boolean;
  project: string | null;
  task: string | null;
}

export interface ActivityTenMinuteSlot {
  time_slot: string;
  slot_start_utc: string;
  slot_end_utc: string;
  slot_start_user_tz: string;
  slot_end_user_tz: string;
  total_duration_seconds: number;
  total_duration_minutes: number;
  active_seconds: number;
  active_minutes: number;
  mouse_clicks: number;
  mouse_movements: number;
  key_presses: number;
  activity_percentage: number;
  screenshots: ActivityShot[];
  /** Comma-separated slot ids accepted by DELETE /delete/screenshot-slot. */
  local_activity_duration_ids: string;
  is_manual: boolean;
  is_deleted: boolean;
  project: string | null;
  task: string | null;
  fraud_flags: FraudFlag[];
}

export interface ActivityHourlySlot {
  hour_slot: string;
  slot_start_user_tz: string;
  total_duration_seconds: number;
  total_duration_minutes: number;
  active_seconds: number;
  active_minutes: number;
  mouse_clicks: number;
  mouse_movements: number;
  key_presses: number;
  activity_percentage: number;
  ten_minute_slots: ActivityTenMinuteSlot[];
}

export interface ActivityHourlyBucket {
  hour_slot: string;
  slot_start_user_tz: string;
  screenshots: ActivityShot[];
}

export interface ActivityScreenshotsResponse {
  status: string;
  is_work_screenshot_block_delete: boolean;
  date: string;
  total_hourly_slots: number;
  total_work: string;
  avg_activity_percentage: number;
  hourly_slots?: ActivityHourlySlot[];
  hourly_buckets?: ActivityHourlyBucket[];
  has_time_off: boolean;
  time_off: unknown[];
}

export interface DeletedScreenshotRecord {
  id: number;
  screenshot_url: string | null;
  thumbnail_url: string | null;
  member_name: string;
  member_id: string;
  project_name: string | null;
  task_name: string | null;
  started_at: string;
  stopped_at: string;
  captured_at: string;
  duration_seconds: number;
  deleted_by_name: string;
  deleted_at: string;
  expiration_date: string;
  is_expiring_soon: boolean;
  delete_reason: string;
  deletion_type: "soft_deleted" | "permanently_deleted";
  is_hipaa_compliance: boolean;
}

export interface DeletedScreenshotsResponse {
  records: DeletedScreenshotRecord[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  filters_applied: {
    member_id: string | null;
    member_search: string | null;
    project_id: string | null;
    task_id: string | null;
    start_date: string | null;
    end_date: string | null;
    deletion_type: string | null;
    timezone: string;
  };
}

/** Detection kind labels (live chunk 351771). */
export const DETECTION_KINDS: Record<string, string> = {
  vm_environment: "VM environment",
  remote_session: "Remote session",
  hw_jiggler_device: "Jiggler device",
  hw_foreign_input_device: "Foreign input device",
  synthetic_input: "Synthetic input",
  known_fraud_process: "Known fraud process",
  screen_loop: "Screen loop",
  context_passive_work: "Passive work",
  context_consumption: "Consumption",
  context_meeting: "Meeting",
  meeting_teammate_confirmed: "Teammate confirmed",
  meeting_session: "Meeting session",
};

export const detectionLabel = (kind: string) => DETECTION_KINDS[kind] ?? kind.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
/** Context (non-fraud) kinds. */
export const isContextKind = (kind: string) => kind.startsWith("context_") || kind.startsWith("meeting_");
export const isMeetingKind = (kind: string) => kind === "context_meeting" || kind.startsWith("meeting_");

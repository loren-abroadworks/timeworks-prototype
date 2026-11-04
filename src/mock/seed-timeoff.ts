/**
 * ============================================================================
 *  DUMMY DATA — time off (policies, assignments, requests, balance adjustments)
 *  and schedules (shift rules). Everything here is fictional.
 * ============================================================================
 * Dates are written relative to the current month (`m: 0` = this month, `m: -2` = two months ago …)
 * so the calendar always has data around "today". A day that falls on a weekend moves to the
 * following Monday. With today = Oct 31 2026 the requests span Aug–Dec 2026.
 * Edit, then POST /api/__reset (or let the dev server hot-reload).
 */
import type { AccrualAnchor, PolicyType, TimeOffStatus } from "@/lib/types/timeoff";

/** Clients (Linked Client picker, Balances › Client column). Ids 11-14 match PROJECTS[].client names. */
export const CLIENTS = [
  { id: 11, name: "Northwind Labs" },
  { id: 12, name: "Bluepeak Health" },
  { id: 13, name: "Orbit Logistics" },
  { id: 14, name: "Greenleaf Retail" },
  { id: 15, name: "Harborview Dental Group" },
  { id: 16, name: "Kestrel Analytics" },
];

export interface SeedPolicy {
  id: number;
  name: string;
  policy_type: PolicyType;
  accrual_year_anchor: AccrualAnchor;
  starting_balance?: number;
  hours_per_year?: number;
  accrual_per_month?: number;
  hours_worked_accrued?: number;
  hours_worked_per_worked?: number;
  paid: boolean;
  is_billable: boolean;
  requires_approval: boolean;
  allow_negative_balances?: boolean;
  max_negative_balance?: number;
  rollover_cap?: number | null;
  rollover_expiry_days?: number | null;
  client_id: number;
  /** Days before "now" the policy was created. */
  createdDaysAgo: number;
}

export const POLICIES: SeedPolicy[] = [
  { id: 101, name: "Vacation Leave", policy_type: "annual", accrual_year_anchor: "calendar_year", hours_per_year: 80, paid: true, is_billable: true, requires_approval: true, rollover_cap: 40, rollover_expiry_days: 90, client_id: 11, createdDaysAgo: 400 },
  { id: 102, name: "Sick Leave", policy_type: "monthly", accrual_year_anchor: "calendar_year", accrual_per_month: 4, paid: true, is_billable: false, requires_approval: false, client_id: 12, createdDaysAgo: 390 },
  { id: 103, name: "Personal Day", policy_type: "none", accrual_year_anchor: "calendar_year", starting_balance: 16, paid: true, is_billable: true, requires_approval: true, client_id: 13, createdDaysAgo: 380 },
  { id: 104, name: "Bereavement Leave", policy_type: "none", accrual_year_anchor: "calendar_year", starting_balance: 24, paid: true, is_billable: false, requires_approval: false, client_id: 14, createdDaysAgo: 370 },
  { id: 105, name: "Unpaid Leave", policy_type: "none", accrual_year_anchor: "calendar_year", starting_balance: 0, paid: false, is_billable: false, requires_approval: true, allow_negative_balances: true, max_negative_balance: 80, client_id: 11, createdDaysAgo: 360 },
  { id: 106, name: "Parental Leave", policy_type: "joined_date", accrual_year_anchor: "policy_joined_date", hours_per_year: 160, paid: true, is_billable: false, requires_approval: true, client_id: 12, createdDaysAgo: 300 },
  { id: 107, name: "Floating Holiday", policy_type: "annual", accrual_year_anchor: "work_anniversary", hours_per_year: 16, paid: true, is_billable: true, requires_approval: false, client_id: 13, createdDaysAgo: 280 },
  { id: 108, name: "Wellness Hours", policy_type: "hours_worked", accrual_year_anchor: "calendar_year", hours_worked_accrued: 1, hours_worked_per_worked: 40, hours_per_year: 40, paid: true, is_billable: true, requires_approval: false, client_id: 14, createdDaysAgo: 200 },
  { id: 109, name: "Volunteer Day", policy_type: "none", accrual_year_anchor: "calendar_year", starting_balance: 8, paid: true, is_billable: false, requires_approval: true, client_id: 11, createdDaysAgo: 150 },
  { id: 110, name: "Jury Duty", policy_type: "none", accrual_year_anchor: "calendar_year", starting_balance: 40, paid: true, is_billable: false, requires_approval: true, client_id: 14, createdDaysAgo: 120 },
  { id: 111, name: "Study Leave", policy_type: "monthly", accrual_year_anchor: "calendar_year", accrual_per_month: 2, paid: false, is_billable: false, requires_approval: true, client_id: 13, createdDaysAgo: 90 },
  { id: 112, name: "Comp Time", policy_type: "none", accrual_year_anchor: "calendar_year", starting_balance: 0, paid: true, is_billable: true, requires_approval: false, allow_negative_balances: true, max_negative_balance: 16, client_id: 12, createdDaysAgo: 60 },
];

/** Policy ids assigned to each member (by MEMBERS index). Order = chip order on Balances. */
export const POLICY_ASSIGNMENTS: number[][] = [
  [101, 102, 103, 107, 108, 105], // Jordan Avery (logged-in Owner)
  [101, 102, 106, 103, 112, 109, 111], // Priya Raman
  [101, 102, 107], // Marcus Bell
  [101, 102, 104, 105, 103], // Elena Sokolova
  [102, 105, 110], // Tomás Herrera
  [101, 102, 103, 107, 108, 106, 109, 112], // Aisha Okafor
  [102, 103], // Liam Chen
  [101, 102], // Sofia Rossi
];

export interface SeedRequest {
  /** MEMBERS index */
  member: number;
  policy: number;
  /** Month offset from the current month. */
  m: number;
  from: number;
  /** Last day (same month); defaults to `from`. */
  to?: number;
  status: TimeOffStatus;
  /** Partial day "HH:mm-HH:mm" (otherwise full day 09:00-17:00). */
  partial?: string;
  notes: string;
  /** Rejection reason (denied requests). */
  reason?: string;
  /** Approver (MEMBERS index) for approved requests; defaults to the Owner. */
  approver?: number;
  attachment?: { file_name: string; file_size: number; content_type: string };
}

export const REQUESTS: SeedRequest[] = [
  // two months ago
  { member: 1, policy: 101, m: -2, from: 3, to: 7, status: "approved", notes: "Family trip to Kerala" },
  { member: 2, policy: 102, m: -2, from: 12, status: "approved", notes: "Dentist appointment and recovery" },
  { member: 3, policy: 103, m: -2, from: 18, status: "denied", notes: "Moving apartments", reason: "Release week — please pick another day" },
  { member: 5, policy: 107, m: -2, from: 21, status: "approved", notes: "Cultural holiday" },
  { member: 0, policy: 101, m: -2, from: 24, to: 28, status: "approved", notes: "Summer vacation", approver: 1 },
  { member: 4, policy: 110, m: -2, from: 10, to: 11, status: "approved", notes: "Jury summons (court letter attached)", attachment: { file_name: "jury-summons.pdf", file_size: 184_320, content_type: "application/pdf" } },
  // last month
  { member: 6, policy: 103, m: -1, from: 4, status: "approved", notes: "Visa appointment" },
  { member: 7, policy: 101, m: -1, from: 8, to: 12, status: "approved", notes: "Wedding in Florence" },
  { member: 5, policy: 102, m: -1, from: 15, status: "approved", partial: "13:00-17:00", notes: "Doctor visit in the afternoon" },
  { member: 3, policy: 101, m: -1, from: 21, to: 25, status: "approved", notes: "Hiking week in the Alps" },
  { member: 2, policy: 107, m: -1, from: 29, status: "submitted", notes: "Floating holiday — Rosh Hashanah" },
  { member: 1, policy: 112, m: -1, from: 17, status: "denied", notes: "Comp time for the weekend release", reason: "Comp time already paid out in September" },
  // this month (the 19th is the busy day: 5 leaves -> "+2 more" in Month view)
  { member: 1, policy: 101, m: 0, from: 19, status: "approved", notes: "Long weekend with family" },
  { member: 2, policy: 101, m: 0, from: 19, to: 20, status: "approved", notes: "Brother's graduation" },
  { member: 3, policy: 102, m: 0, from: 19, status: "approved", notes: "Flu" },
  { member: 5, policy: 103, m: 0, from: 19, status: "submitted", notes: "Passport renewal" },
  { member: 6, policy: 102, m: 0, from: 19, status: "approved", notes: "Migraine" },
  { member: 4, policy: 102, m: 0, from: 6, to: 7, status: "approved", notes: "Stomach bug" },
  { member: 5, policy: 101, m: 0, from: 26, to: 30, status: "approved", notes: "Annual family visit", attachment: { file_name: "flight-itinerary.png", file_size: 96_256, content_type: "image/png" } },
  { member: 3, policy: 105, m: 0, from: 28, status: "submitted", notes: "Apartment handover" },
  { member: 6, policy: 103, m: 0, from: 22, status: "approved", partial: "09:00-13:00", notes: "Bank appointment (morning)" },
  { member: 2, policy: 102, m: 0, from: 13, status: "denied", notes: "Not feeling well", reason: "Please file under Personal Day — sick balance is reserved" },
  // next month
  { member: 0, policy: 101, m: 1, from: 23, to: 27, status: "submitted", notes: "Thanksgiving week" },
  { member: 0, policy: 102, m: 1, from: 9, status: "approved", notes: "Annual check-up" },
  { member: 1, policy: 103, m: 1, from: 6, status: "submitted", notes: "Diwali celebrations" },
  { member: 2, policy: 101, m: 1, from: 16, to: 20, status: "submitted", notes: "Road trip — handover doc shared with the team" },
  { member: 3, policy: 104, m: 1, from: 12, to: 13, status: "approved", notes: "Family funeral" },
  { member: 5, policy: 108, m: 1, from: 3, status: "submitted", partial: "14:00-17:00", notes: "Physiotherapy session" },
  { member: 4, policy: 105, m: 1, from: 2, to: 4, status: "submitted", notes: "Helping parents move" },
  { member: 7, policy: 102, m: 1, from: 30, status: "denied", notes: "Feeling unwell", reason: "Duplicate of an earlier request" },
  // in two months
  { member: 1, policy: 101, m: 2, from: 21, to: 31, status: "submitted", notes: "Year-end holidays" },
  { member: 5, policy: 107, m: 2, from: 24, status: "approved", notes: "Christmas Eve" },
  { member: 6, policy: 102, m: 2, from: 14, status: "submitted", notes: "Minor surgery follow-up" },
  { member: 3, policy: 101, m: 2, from: 28, to: 31, status: "denied", notes: "New Year trip", reason: "Coverage needed during the year-end close" },
  { member: 2, policy: 103, m: 2, from: 7, status: "approved", notes: "Kid's school play" },
];

export interface SeedAdjustment {
  member: number;
  policy: number;
  /** Signed hours. */
  hours: number;
  daysAgo: number;
  reason: string;
  /** MEMBERS index of who adjusted. */
  by: number;
}

/** Balance adjustments (Balances › Adjust Balance history, Audit Trail). */
export const ADJUSTMENTS: SeedAdjustment[] = [
  { member: 5, policy: 101, hours: -16, daysAgo: 2, reason: "Correction: leave taken before the policy migration", by: 0 },
  { member: 5, policy: 102, hours: 4, daysAgo: 1, reason: "Carry-over from the previous HR system", by: 1 },
  { member: 5, policy: 112, hours: 6, daysAgo: 1, reason: "Weekend deployment support", by: 0 },
  { member: 1, policy: 103, hours: 8, daysAgo: 3, reason: "Granted for on-call cover during the launch", by: 0 },
  { member: 3, policy: 101, hours: -8, daysAgo: 4, reason: "Duplicate accrual removed", by: 1 },
  { member: 0, policy: 107, hours: 8, daysAgo: 5, reason: "Company anniversary bonus day", by: 1 },
  { member: 2, policy: 101, hours: 20, daysAgo: 6, reason: "Sign-on balance top-up", by: 0 },
  { member: 4, policy: 105, hours: -4, daysAgo: 2, reason: "Payroll reconciliation", by: 1 },
  { member: 6, policy: 103, hours: 4, daysAgo: 20, reason: "Manual correction after policy change", by: 0 },
];

/* ---------------------------------------------------------------------------
 * Schedules (Calendar › Schedules): shift rules per member (MEMBERS index).
 * Days: 1 = Monday … 7 = Sunday. Times are in the organization time zone.
 * ------------------------------------------------------------------------- */
export interface SeedShiftRule {
  member: number;
  name: string;
  shift_type: "fixed" | "flexible" | "hybrid_flex";
  days: number[];
  start: string;
  end: string;
  /** Expected hours per day "HH:MM:SS". */
  minimum_hour: string;
  shift_buffer_seconds: number | null;
  /** Days before today the rule became effective. */
  effectiveDaysAgo: number;
  /** Per-weekday start overrides (e.g. a shorter Friday). */
  dayTimes?: Record<number, [string, string]>;
}

export const SHIFT_RULES: SeedShiftRule[] = [
  { member: 1, name: "IST Day Shift", shift_type: "fixed", days: [1, 2, 3, 4, 5], start: "09:00:00", end: "17:00:00", minimum_hour: "08:00:00", shift_buffer_seconds: 600, effectiveDaysAgo: 70 },
  { member: 2, name: "Central Morning", shift_type: "fixed", days: [1, 2, 3, 4, 5], start: "10:00:00", end: "18:00:00", minimum_hour: "08:00:00", shift_buffer_seconds: 900, effectiveDaysAgo: 60, dayTimes: { 5: ["09:00:00", "15:00:00"] } },
  { member: 3, name: "Berlin Core Hours", shift_type: "hybrid_flex", days: [1, 2, 3, 4], start: "08:00:00", end: "16:00:00", minimum_hour: "07:30:00", shift_buffer_seconds: null, effectiveDaysAgo: 45 },
  { member: 5, name: "Lagos Support Shift", shift_type: "fixed", days: [1, 2, 3, 4, 5, 6], start: "08:00:00", end: "16:00:00", minimum_hour: "08:00:00", shift_buffer_seconds: 300, effectiveDaysAgo: 90, dayTimes: { 6: ["09:00:00", "13:00:00"] } },
  { member: 6, name: "Manila Part-time", shift_type: "flexible", days: [1, 3, 5], start: "12:00:00", end: "16:00:00", minimum_hour: "04:00:00", shift_buffer_seconds: null, effectiveDaysAgo: 30 },
];

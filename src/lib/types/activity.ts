/** Response types of the Activity › App and Activity › URLs endpoints (shapes from the live React Query cache). */

export interface AppUsageApplication {
  application_name: string;
  usage_seconds: number;
  usage_seconds_interval: string;
  project: string;
}

export interface AppUsageProjectBlock {
  total_usage_interval: string;
  applications: AppUsageApplication[];
}

/** { hour_bucket: "2026-10-28 09:00:00", "<project name>": AppUsageProjectBlock, … } */
export type AppUsageRecord = { hour_bucket: string } & { [project: string]: AppUsageProjectBlock | string };

export interface AppUsageResponse {
  organization_timezone: string;
  records: AppUsageRecord[];
  top_5_applications: { application_name: string; total_usage_interval: string }[];
}

export interface UrlRow {
  url: string;
  project: string;
  task: string;
  time_spent: string;
}

export interface UrlDomain {
  domain: string;
  link_count: number;
  total_time: string;
  urls: UrlRow[];
}

export interface UrlPagination {
  total_days: number;
  limit: number;
  offset: number;
  total_pages: number;
}

export interface MyUrlsResponse {
  pagination: UrlPagination;
  days: { date: string; date_formatted: string; url_count: number; total_time: string }[];
}

export interface UrlsByDateResponse {
  days: { date: string; domains: UrlDomain[] }[];
}

export interface UrlAdminResponse {
  pagination: UrlPagination;
  days: { date: string; date_formatted: string; url_count: number; total_time: string; domains: UrlDomain[] }[];
}

export interface UrlDrilldownResponse {
  pagination: { total_pages: number; limit: number; offset: number };
  days: { date: string; url_count: number }[];
}

export interface UrlGridSlot {
  urlCount: number;
  alertCount: number;
  status: "active" | "empty" | "upcoming";
}

export interface UrlGridResponse {
  total: number;
  buckets: string[];
  bucketLabels: string[];
  employees: { employee_id: string; employee_name: string; slots: Record<string, UrlGridSlot> }[];
}

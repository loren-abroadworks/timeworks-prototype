/**
 * ============================================================================
 *  DUMMY DATA — edit this file to change what the dashboard shows.
 * ============================================================================
 * Everything here is fictional. The mock engine (src/mock/engine.ts) turns these
 * definitions into deterministic day-by-day time records, so numbers change when
 * you move the date range but are identical on every reload.
 *
 * Quick recipes
 *  - Rename the company / logged-in user: ORGANIZATION / MEMBERS[0].
 *  - Make someone a "low activity" member: lower their `activity` (e.g. 25).
 *  - Make the dashboard look busier: raise `hoursPerDay`.
 *  - Change the fake desktop screenshots: files in /public/mock-screens.
 * After editing, the dev server hot-reloads; or call POST /api/__reset.
 */

export const ORGANIZATION = {
  organization_id: 3, // kept as 3 so links have the same shape as the live app (/organizations/3/...)
  organization_name: "Acme Remote Co.",
  time_zone: "America/New_York",
};

/** The user that is "logged in" to the replica. Must match MEMBERS[0].user_id. */
export const DEMO_USER_ID = "0f9c2a71-5b3e-7d41-9a6c-2e8b4d1f7a30";

export interface SeedMember {
  user_id: string;
  full_name: string;
  email: string;
  role: "Owner" | "Manager" | "Member";
  /** Optional avatar picture (otherwise the initial is shown). */
  profile_image_url: string | null;
  /** Average tracked hours on a working day. */
  hoursPerDay: number;
  /** Typical activity level in % (keyboard/mouse activity). */
  activity: number;
  /** Hourly pay rate (USD) and billable rate charged to clients. */
  payRate: number;
  billRate: number;
  /** Work limits shown in the Weekly / Daily Limits cards (hours, 0 = no limit). */
  weeklyLimitHours: number;
  dailyLimitHours: number;
  /** Projects (ids) this member logs time against. */
  projects: string[];
  /** Days since the member last tracked time (0 = active today). Overrides generated data for "today". */
  lastActiveDaysAgo: number;
  /** IANA time zone the member works in (their tracked hours are generated in this zone). */
  timezone: string;
  /** "Started on" date shown on the Timesheets member card. */
  startDate: string;
  /** Team ids (see TEAMS). */
  teams: number[];
}

export const MEMBERS: SeedMember[] = [
  {
    user_id: DEMO_USER_ID,
    full_name: "Jordan Avery",
    email: "jordan.avery@acme-remote.example",
    role: "Owner",
    profile_image_url: null,
    hoursPerDay: 6.4,
    activity: 66,
    payRate: 48,
    billRate: 85,
    weeklyLimitHours: 40,
    dailyLimitHours: 8,
    projects: ["p-website", "p-mobile", "p-internal"],
    lastActiveDaysAgo: 0,
    timezone: "America/New_York",
    startDate: "2023-03-06",
    teams: [1, 2],
  },
  {
    user_id: "1b7e4c22-8d90-7a13-b5f2-6c0d9e3a1f44",
    full_name: "Priya Raman",
    email: "priya.raman@acme-remote.example",
    role: "Manager",
    profile_image_url: "/mock-avatars/avatar-1.svg",
    hoursPerDay: 7.6,
    activity: 72,
    payRate: 42,
    billRate: 80,
    weeklyLimitHours: 40,
    dailyLimitHours: 8,
    projects: ["p-mobile", "p-pipeline", "p-support"],
    lastActiveDaysAgo: 0,
    timezone: "Asia/Kolkata",
    startDate: "2023-07-17",
    teams: [1],
  },
  {
    user_id: "2c8f5d33-9ea1-7b24-86a3-7d1eaf4b2a55",
    full_name: "Marcus Bell",
    email: "marcus.bell@acme-remote.example",
    role: "Member",
    profile_image_url: null,
    hoursPerDay: 7.9,
    activity: 58,
    payRate: 35,
    billRate: 65,
    weeklyLimitHours: 40,
    dailyLimitHours: 9,
    projects: ["p-website", "p-brand"],
    lastActiveDaysAgo: 0,
    timezone: "America/Chicago",
    startDate: "2024-01-08",
    teams: [2, 3],
  },
  {
    user_id: "3d9a6e44-afb2-7c35-97b4-8e2fb05c3b66",
    full_name: "Elena Sokolova",
    email: "elena.sokolova@acme-remote.example",
    role: "Member",
    profile_image_url: "/mock-avatars/avatar-2.svg",
    hoursPerDay: 6.8,
    activity: 31,
    payRate: 38,
    billRate: 70,
    weeklyLimitHours: 30,
    dailyLimitHours: 6,
    projects: ["p-pipeline", "p-internal"],
    lastActiveDaysAgo: 0,
    timezone: "Europe/Berlin",
    startDate: "2024-04-22",
    teams: [1],
  },
  {
    user_id: "4eab7f55-b0c3-7d46-a8c5-9f30c16d4c77",
    full_name: "Tomás Herrera",
    email: "tomas.herrera@acme-remote.example",
    role: "Member",
    profile_image_url: null,
    hoursPerDay: 5.5,
    activity: 27,
    payRate: 30,
    billRate: 55,
    weeklyLimitHours: 25,
    dailyLimitHours: 5,
    projects: ["p-support", "p-brand"],
    lastActiveDaysAgo: 1,
    timezone: "America/Mexico_City",
    startDate: "2024-09-02",
    teams: [4],
  },
  {
    user_id: "5fbc8066-c1d4-7e57-b9d6-a041d27e5d88",
    full_name: "Aisha Okafor",
    email: "aisha.okafor@acme-remote.example",
    role: "Member",
    profile_image_url: null,
    hoursPerDay: 7.2,
    activity: 81,
    payRate: 45,
    billRate: 90,
    weeklyLimitHours: 40,
    dailyLimitHours: 8,
    projects: ["p-mobile", "p-website"],
    lastActiveDaysAgo: 0,
    timezone: "Africa/Lagos",
    startDate: "2023-11-13",
    teams: [1, 2],
  },
  {
    user_id: "60cd9177-d2e5-7f68-8ae7-b152e38f6e99",
    full_name: "Liam Chen",
    email: "liam.chen@acme-remote.example",
    role: "Member",
    profile_image_url: null,
    hoursPerDay: 4.2,
    activity: 38,
    payRate: 28,
    billRate: 50,
    weeklyLimitHours: 20,
    dailyLimitHours: 4,
    projects: ["p-internal", "p-support"],
    lastActiveDaysAgo: 3,
    timezone: "Asia/Manila",
    startDate: "2025-02-03",
    teams: [4],
  },
  {
    user_id: "71dea288-e3f6-7079-9bf8-c26304907faa",
    full_name: "Sofia Rossi",
    email: "sofia.rossi@acme-remote.example",
    role: "Member",
    profile_image_url: null,
    hoursPerDay: 3.0,
    activity: 54,
    payRate: 33,
    billRate: 60,
    weeklyLimitHours: 0,
    dailyLimitHours: 0,
    projects: ["p-brand"],
    lastActiveDaysAgo: 34,
    timezone: "Europe/Rome",
    startDate: "2025-06-16",
    teams: [3],
  },
];

/** Teams shown on the Timesheets member card (ids referenced by MEMBERS[].teams). */
export const TEAMS = [
  { id: 1, name: "Product Engineering" },
  { id: 2, name: "Client Delivery" },
  { id: 3, name: "Design Studio" },
  { id: 4, name: "Customer Success" },
];

/**
 * Managers per member (user ids), shown as "Manager (n)" on the Timesheets member card.
 * Members not listed are managed by the Owner (Jordan) and Priya.
 */
export const MANAGERS: Record<string, string[]> = {
  "0f9c2a71-5b3e-7d41-9a6c-2e8b4d1f7a30": ["1b7e4c22-8d90-7a13-b5f2-6c0d9e3a1f44"],
  "1b7e4c22-8d90-7a13-b5f2-6c0d9e3a1f44": ["0f9c2a71-5b3e-7d41-9a6c-2e8b4d1f7a30"],
};

export interface SeedProject {
  id: string;
  name: string;
  client: string | null;
  tasks: string[];
  /** Relative share of a member's day spent on this project when they are assigned to it. */
  weight: number;
}

export const PROJECTS: SeedProject[] = [
  {
    id: "p-website",
    name: "Website Redesign",
    client: "Northwind Labs",
    tasks: ["Landing page build", "Design QA", "CMS migration", "Accessibility fixes", "Performance tuning"],
    weight: 3,
  },
  {
    id: "p-mobile",
    name: "Mobile App v2",
    client: "Bluepeak Health",
    tasks: ["Onboarding flow", "Push notifications", "Bug triage", "Release prep", "API integration"],
    weight: 3,
  },
  {
    id: "p-pipeline",
    name: "Data Pipeline",
    client: "Orbit Logistics",
    tasks: ["ETL jobs", "Dashboard metrics", "Schema review", "Monitoring alerts"],
    weight: 2,
  },
  {
    id: "p-brand",
    name: "Brand Refresh",
    client: "Northwind Labs",
    tasks: ["Logo exploration", "Style guide", "Social templates", "Presentation deck"],
    weight: 2,
  },
  {
    id: "p-support",
    name: "Customer Support Portal",
    client: "Greenleaf Retail",
    tasks: ["Ticket backlog", "Knowledge base", "Live chat setup", "Escalation review"],
    weight: 2,
  },
  {
    id: "p-internal",
    name: "Internal Ops",
    client: null, // shows "—" in the Client column
    tasks: ["Team meetings", "Hiring interviews", "Planning", "Documentation"],
    weight: 1,
  },
];

export interface SeedApp {
  /** Raw name as the desktop agent reports it (apps keep their extension, e.g. "Code.exe"). */
  name: string;
  type: "app" | "url";
  /** Relative usage weight. */
  weight: number;
}

/** 30+ entries so the "View All" sheet has more than one page (20 rows per page). */
export const APPS: SeedApp[] = [
  { name: "Code.exe", type: "app", weight: 30 },
  { name: "chrome.exe", type: "app", weight: 26 },
  { name: "Slack.exe", type: "app", weight: 14 },
  { name: "Figma.exe", type: "app", weight: 10 },
  { name: "zoom.us", type: "app", weight: 8 },
  { name: "Windows Terminal.exe", type: "app", weight: 7 },
  { name: "Notion.exe", type: "app", weight: 6 },
  { name: "Postman.exe", type: "app", weight: 5 },
  { name: "Microsoft Excel.exe", type: "app", weight: 4 },
  { name: "Outlook.exe", type: "app", weight: 4 },
  { name: "Spotify.exe", type: "app", weight: 3 },
  { name: "Docker Desktop.exe", type: "app", weight: 3 },
  { name: "Microsoft Teams.exe", type: "app", weight: 3 },
  { name: "Explorer.exe", type: "app", weight: 2 },
  { name: "Photoshop.exe", type: "app", weight: 2 },
  { name: "Notepad.exe", type: "app", weight: 1 },
  { name: "Calculator.exe", type: "app", weight: 1 },
  { name: "github.com", type: "url", weight: 18 },
  { name: "docs.google.com", type: "url", weight: 14 },
  { name: "mail.google.com", type: "url", weight: 9 },
  { name: "stackoverflow.com", type: "url", weight: 7 },
  { name: "figma.com", type: "url", weight: 6 },
  { name: "jira.acme-remote.example", type: "url", weight: 6 },
  { name: "calendar.google.com", type: "url", weight: 4 },
  { name: "developer.mozilla.org", type: "url", weight: 4 },
  { name: "linear.app", type: "url", weight: 3 },
  { name: "vercel.com", type: "url", weight: 3 },
  { name: "chat.openai.com", type: "url", weight: 2 },
  { name: "youtube.com", type: "url", weight: 2 },
  { name: "news.ycombinator.com", type: "url", weight: 1 },
  { name: "linkedin.com", type: "url", weight: 1 },
  { name: "drive.google.com", type: "url", weight: 2 },
];

/** Fake desktop screenshots (SVGs in /public/mock-screens) used by "Recent Screenshots". */
export const SCREENSHOT_IMAGES = [
  "/mock-screens/screen-01.svg",
  "/mock-screens/screen-02.svg",
  "/mock-screens/screen-03.svg",
  "/mock-screens/screen-04.svg",
  "/mock-screens/screen-05.svg",
  "/mock-screens/screen-06.svg",
];

export const MOCK_SETTINGS = {
  /** Artificial API latency so skeleton loaders are visible. Override with env MOCK_LATENCY_MS or ?latency=0. */
  latencyMs: 300,
  /** How many days of history to generate (the date arrows can go back this far). */
  historyDays: 400,
  /** Random seed: change it to get a different (but still deterministic) data set. */
  seed: 20261029,
  /** Members below this average activity (%) appear in "Low Activity". */
  lowActivityThreshold: 45,
  /** Chance (0-1) that a working day is a paid-time-off day. */
  ptoChance: 0.03,
};

# TimeWorks Dashboard — local replica

A pixel-faithful, fully offline replica of the TimeWorks **Dashboard** (both **My Dashboard** and
**Manager View** tabs) with a built-in mock API and fictional dummy data ("Acme Remote Co.").

Use it for recording video manuals, prototyping changes, UI QA, Playwright E2E, API contract tests
and AI-agent practice. Nothing talks to the real TimeWorks servers.

## Run it

```bash
npm install
npm run dev          # http://localhost:4317  (redirects to the demo user's dashboard)
```

Production mode: `npm run build && npm start` (same port, 4317).

Useful URLs (the demo user id is `0f9c2a71-5b3e-7d41-9a6c-2e8b4d1f7a30`):

| Page | URL |
| --- | --- |
| My Dashboard | http://localhost:4317/dashboard/0f9c2a71-5b3e-7d41-9a6c-2e8b4d1f7a30/my_dashboard |
| Manager View | http://localhost:4317/dashboard/0f9c2a71-5b3e-7d41-9a6c-2e8b4d1f7a30/manager_view |
| Empty states | add `?scenario=empty` to any page (add `?scenario=default` to switch back) |
| No loading delay | add `?latency=0` (or `?latency=2000` to make skeletons easy to film) |

`?scenario=` and `?latency=` are remembered in a cookie, so they stick while you click around.

## Edit the dummy data

All fictional data lives in **`src/mock/seed.ts`** — that's the only file you normally touch:

- `ORGANIZATION` – company name / id (id stays `3` so links look like the live app: `/organizations/3/...`)
- `MEMBERS` – the 8 people, the first one is the logged-in "Owner". Each has `hoursPerDay`, `activity` (%),
  `payRate` / `billRate`, weekly/daily limits, projects, and `lastActiveDaysAgo`.
  Lower someone's `activity` below 45 to put them in **Low Activity**.
- `PROJECTS` – projects, their client (or `null` → shows "—") and task names.
- `APPS` – apps & URLs (32 entries so the "View All" sheet has 2 pages).
- `SCREENSHOT_IMAGES` – fake desktop screenshots in `public/mock-screens/` (regenerate with `npm run generate:assets`
  or drop your own PNG/SVG files there).
- `MOCK_SETTINGS` – latency, history length, random seed, low-activity threshold, PTO chance.

The engine (`src/mock/store.ts`) expands this into one record per member per day (400 days of history,
deterministic: same numbers on every reload, different numbers for different date ranges).
"Today" is partially filled based on the current time. Screenshots are generated for the two full hours
before "now".

**Reset**: `curl -X POST http://localhost:4317/api/__reset` regenerates the in-memory store
(it also rebuilds automatically when the day changes). Code edits hot-reload in `npm run dev`.

Environment variables (optional): `MOCK_SCENARIO=empty`, `MOCK_LATENCY_MS=0`.

## Mock API (mirrors the live paths under `/api/v1`)

| Endpoint | Used by |
| --- | --- |
| `GET /api/v1/user/details` | header user chip, org id |
| `GET /api/v1/user/permission/{org}` | shows the My Dashboard / Manager View switcher (`team-dashboard`) |
| `GET /api/v1/user-permission/{org}` | sidebar navigation tree |
| `GET /api/v1/dashboard/user-summary/{org}?start_date&end_date&type=employee\|manager` | KPI cards, Top Apps, Projects & Tasks / Projects-Clients, Top Employees |
| `GET /api/v1/dashboard/graph-data/{org}?start_date&end_date&type=manager` | Company Performance Chart |
| `GET /api/v1/dashboard/manager-secondary/{org}?start_date&end_date&type=manager` | Low Activity, Members, Weekly/Daily Limits |
| `GET /api/v1/dashboard/app-usage-all/{org}?limit&offset&search&start_date&end_date` | Top Apps "View All" |
| `GET /api/v1/dashboard/projects-tasks-all/{org}?…&project_id` | Projects & Task Tracking "View All" |
| `GET /api/v1/dashboard/{projects-clients,top-employees,low-activity,members-activity}-all/{org}?…&filter_user_id` | Manager View "View All" sheets |
| `GET /api/v1/dashboard/{weekly,daily}-limits-all/{org}?limit&offset&search&filter_user_id` | Limits "View All" |
| `GET /api/v1/activity-screenshots/{org}?activity_date&timezone&view_mode=every_ten_minutes\|all_records&user_id` | Recent Screenshots |
| `GET /api/v1/all/projects/{org}`, `GET /api/v1/all/user/{org}` | project / member filters |
| `POST /api/__reset` | regenerate data |

Every endpoint also accepts `?scenario=empty` and `?latency=<ms>`.
Response types: `src/lib/api-types.ts`. React Query keys mirror the live app (e.g. `["DASHBOARD","USER_SUMMARY",org,start,end,type]`),
see `src/lib/endpoints.ts`.

## Tests

```bash
npm test             # API contract tests (vitest) – asserts every endpoint's response shape
npm run test:e2e     # Playwright E2E (builds + starts the app on :4317 if not running)
npm run screens      # re-captures docs/replica-screens/*.png
```

First time only: `npx playwright install chromium`.

E2E covers: both tabs load, tab switching, date arrows / Quick Select change the numbers, blurred payment,
Top Apps tabs, "View All" sheets (pagination, search, project & member filters), screenshot modes,
group checkbox selection, full-screen viewer (keyboard ←/→/Esc), chart tooltip, lazy-loaded lower
widgets, empty scenario, sidebar → "coming soon" page. Stable `data-testid`s are listed in the specs.

## Where things live

```
src/
  app/
    dashboard/[userId]/layout.tsx          shell + tab switcher + date range (both tabs)
    dashboard/[userId]/my_dashboard/       My Dashboard page
    dashboard/[userId]/manager_view/       Manager View page
    organizations/[orgId]/[...rest]/       "Coming soon in replica" for other sidebar links
    reports/[userId]/[...rest]/            same, for report links
    api/v1/**/route.ts                     mock API route handlers (one file per endpoint)
    api/%5F%5Freset/route.ts               POST /api/__reset ("%5F" = "_", Next.js naming rule)
  components/
    layout/AppShell.tsx                    background scene, sidebar, sticky glass header, <main>
    layout/AppSidebar.tsx, nav-config.tsx  sidebar (icons, order, URLs, popover sub-menus, collapse/expand)
    layout/PageHeader.tsx                  "Dashboard" breadcrumb + user chip
    dashboard/shared/DashboardHeader.tsx   My Dashboard | Manager View tabs, ◀ date picker ▶ (7-day steps)
    dashboard/shared/DateRangePicker.tsx   Quick Select presets + two-month calendar
    dashboard/shared/StatCard.tsx          KPI card (blur-until-click for money)
    dashboard/shared/ProgressListCard.tsx  list with progress bars (Projects & Tasks, Weekly/Daily Limits)
    dashboard/shared/DataTableCard.tsx     table card (Projects/Clients, Top Employees, Low Activity, Members)
    dashboard/shared/ViewAllSheet.tsx      right-side sheet frame + "Showing 1–20 of N" pagination
    dashboard/shared/FilterSelect.tsx      Project / Member filter dropdowns
    dashboard/my/MyDashboard.tsx           My Dashboard composition + 4 KPI cards
    dashboard/my/TopAppsCard.tsx (+Sheet)  Top Apps & URL's
    dashboard/my/ProjectsTasksCard.tsx     Projects & Task Tracking (+ View All sheet)
    dashboard/my/RecentScreenshots.tsx     Recent Screenshots (modes, groups, checkboxes)
    dashboard/my/ScreenshotViewer.tsx      full-screen viewer
    dashboard/manager/ManagerView.tsx      Manager View composition + 4 KPI cards
    dashboard/manager/PerformanceChart.tsx Company Performance Chart (recharts)
    dashboard/manager/*Card.tsx            Projects/Clients, Top Employees, Low Activity, Members, Limits
    ui/*                                   design-system primitives (Button, Tabs, Sheet, Table, …) with live data-slot attrs
  lib/                                     API client, endpoint registry, formatters, URL params, session
  mock/seed.ts                             ← dummy data
  mock/store.ts, engine.ts, http.ts        data generation, aggregation, latency/scenario plumbing
  styles/timeworks-compiled.css            the live app's compiled CSS, verbatim
  styles/theme-tokens.css                  token → Tailwind mapping (auto-generated from the compiled CSS)
```

### Styling

`src/styles/timeworks-compiled.css` is the live stylesheet copied verbatim, so every original class renders
identically (theme variables for `.dark` + `data-accent="blue"`, wallpaper/blob background layers, etc.).
Tailwind v4 is also set up (`src/app/globals.css`), so **new classes you add work too**; design tokens such as
`bg-secondary-surface`, `border-layout-subtle`, `text-muted-foreground`, `bg-ui-background`, `bg-sidebar`
map to the same CSS variables. The compiled CSS is imported after Tailwind's output, so the original wins where both define a class.

## Fidelity notes (what is guessed or not exact)

- **Data** is fictional and larger than the live test account; layouts were compared against the live
  screenshots (see `docs/replica-screens/live-scale-*.png`). The live screenshots were captured from a ~1920px-wide
  window scaled to 1568px, so the `live-scale-*` captures use a 1920×945 viewport at 0.8167 device scale;
  `1568-*` captures use a true 1568×772 viewport as requested.
- **Fonts**: only the Latin subsets of Karla and Montserrat are bundled (`public/fonts`), loaded with the same
  hashed class names the live app uses; non-Latin characters fall back to Arial.
- **Sidebar sub-menus**: the live sidebar items (other than Dashboard) open popovers whose exact styling was not
  captured; the replica popover (title + links) is a best guess. Child page names were derived from slugs.
  The expanded (16rem) sidebar state is approximated (icons + labels); the collapsed state is exact.
- **Sidebar API**: the `user-permission/{org}` tree shape follows the captured query shape; ids/names are invented.
- **Date picker popover**: built from the live component code; the month/year drill-down views of the calendar
  header are not implemented (the month/year labels are static).
- **Project / Member filter dropdowns**: built from the live component code but simplified (no `cmdk`), the
  member filter placeholder text ("Select Member") is a guess.
- **User chip / org switcher dropdown menus**: contents are placeholders (the live menus were not captured).
- **Screenshot viewer**: same markup as the live app, including the translucent dark background
  (the live `dark:bg-secondary-surface` overrides `bg-[#12131a]`). Images use `<img>` instead of `next/image`.
- **Top Apps "View All" sheet**: tabs list is `shrink-0` so the search box does not squeeze it (small replica tweak).
- **Mock semantics** (guessed): app/URL `activity_percentage` = share of tracked time; "This Week" = Monday→today;
  Low Activity = average activity below 45%; Top Employees = top 5 by hours; Projects card = top 6;
  card lists show the top 5; "Last Active" labels ("Today", "Yesterday", "N days ago", "1 month ago").
  PTO days add 8h of PTO time (counted in Time Worked / Payment like the live totals).
- **Recent Screenshots** use the browser's "today"; dummy captures exist for the two full hours before the current
  hour (just after midnight they show 00:00–02:00). `?ss_date=YYYY-MM-DD` shows another day (14:00–16:00).
- **Empty-state astronaut image** is the real 2.3 MB SVG; the live screenshot was taken before it finished loading,
  so there it appears blank.
- The live app's "space" background canvas animation only runs for `data-scene="space"`; with `data-scene="none"`
  (the live setting) nothing is drawn, so it was not ported.

---

# Batch 1 — app shell, Timesheets, Activity

## New pages

| Page | URL |
| --- | --- |
| Timesheets › View & Edit | `/organizations/3/timesheets/view_edit` (`?start_date&end_date&user_id&user_name&page&date&timezone`) |
| Activity › Screenshots | `/organizations/3/activities/screenshots` (`?date&user_id&view=all_records&timezone`) |
| Activity › App | `/organizations/3/activities/apps` (`?date&user_id`) |
| Activity › URLs (My URLs) | `/organizations/3/activities/urls` |
| Activity › URLs (All URLs / URL management) | `/organizations/3/activities/urls/admin_view` (`?view=day\|week\|month\|year&start_date&end_date&page&alerts_filter`) |
| Activity › Deleted Screenshots | `/organizations/3/activities/deleted_screenshots` |
| Profile menu targets (coming soon) | `/account`, `/download`, `/faq`, `/organizations/active`, `/organizations/create` |

Every other sidebar link (35 in total, same labels / URLs as the live nav map) still lands on the "Coming soon" page.

**Shell** (`src/components/layout/*`): expanded sidebar (accordion, Settings › Organization / Employees second level, active
states), collapsed sidebar with click-to-open flyouts, collapse toggle + Ctrl/⌘+B persisted in `localStorage["sidebar_state"]`
(default collapsed), org switcher (Acme Remote Co. ✓ / Manage / Create organization), profile menu (Profile, Appearance,
Desktop App, Help & FAQs, Report a Bug, Sign out → toast only). **Appearance** works locally (theme, accent, background
scene, blur, wallpaper; live keys `tw-mode`, `tw-accent`, `tw-scene`, `tw-background-blur`, plus `tw-replica-wallpaper`),
applied before first paint by a script in `src/app/layout.tsx`. **Report a Bug** posts FormData to `POST /report-bug/submit`
(same path as live; kept in memory, `GET` lists them).

**Shared toolbar** (`src/components/filters/*`): Filters popover (Filter options / Saved filters with save / edit / delete),
member selector, timezone selector (Your / Company / Local + search), filter chips (single or multi-select), day and range
navigators, ⋮ / export menus, react-hot-toast toasts.

## Data model (how writes behave)

`src/mock/store.ts` now generates individual **time entries** (UTC start/stop, project, task, activity, idle / manual / paid
flags) for every member on their own local calendar (`timezone` per member in `seed.ts`). "Today" ends ~2 minutes before
now, so live-looking data exists at any hour. Dashboard day records are re-derived from the entries after every write,
so **edits on Timesheets / Screenshots change the Dashboard totals too**. 10-minute slots (screenshots, keyboard / mouse
counts) are derived from the entries (`src/mock/timeline.ts`); app usage and URL visits are derived from entries + the
day's app mix (`src/mock/app-usage.ts`, `src/mock/urls.ts`, data in `src/mock/seed-activity.ts`). Writes live in memory
until `POST /api/__reset` (or a day roll-over). Entries older than 35 days are `is_paid` (delete asks for confirmation).
Playwright pins the browser to `America/New_York` (the demo user's zone).

## New endpoints (all under `/api/v1`, all honour `?scenario=empty` / `?latency=`)

| Method + path | Notes |
| --- | --- |
| `GET /get-timezone` | timezone list (subset of the live ~600 rows, same row shape) |
| `GET/POST /saved-filters/{org}?page_key=`, `PUT/DELETE /saved-filters/{org}/{id}`, `PUT /saved-filters/{org}/reorder` | saved filters |
| `GET /reports/user-time-sheet/{org}/{user}?start_date&end_date&timezone_str&offset&limit[&project_id&time_type&activity_level][&export_type=excel\|pdf]` | timesheet (shape = live `USER_TIMESHEETS`) |
| `GET /project/tasks/{org}/{project}`, `GET /project/all-tasks/{org}/{project}/{user}` | To-Do lists for dialogs |
| `POST /add/time-entries[-slot]/{org}/{user}?timezone_str` | add manual time `{started_at_utc, stopped_at_utc, project_id, task_id, notes}` |
| `PUT /edit/time-entries[-slot]/…`, `PUT /manual-entry-edit/time-entries[-slot]/…` | edit (tracked / manual) |
| `PUT /split/time-entries[-slot]/…` | split into sequential parts |
| `DELETE /delete/time-entries-block/…`, `/delete/time-entries/…`, `/manual-delete/time-entries/…` | delete `{local_activity_duration_id, reasons}` |
| `POST /bulk-delete/time-entries/{org}/{user}` | `{timezone_str, items:[…]}` |
| `GET /activity-screenshots/{org}?activity_date&timezone&view_mode&user_id` | rebuilt from entries, full live shape (also feeds Dashboard › Recent Screenshots) |
| `DELETE /delete/screenshot-slot/{org}/{user}` | `{local_activity_duration_id:["slot-<ms>"], delete_reason}` → removes the slot's time + soft-deletes its screenshots |
| `GET /audit/deleted-screenshots/{org}?page&page_size&timezone&…` | deleted list (37 seeded records) |
| `POST /deleted-activity-screenshots/{org}/{id}/restore`, `DELETE /deleted-activity-screenshots/{org}/{id}`, `POST …/bulk-restore`, `POST …/bulk-permanent-delete` | restore puts the slot's time back |
| `POST /bulk-activity-screenshots/{org}/bulk-download/async`, `GET …/bulk-download/status/{task}` | stub: no ZIP is produced (`download_url: null`) |
| `POST /track-screenshot-detail-view/{org}` | view audit stub (in memory) |
| `GET /application-usage-project/{org}?date&timezone&user_id` | App page |
| `GET /activity/urls/{org}/me`, `/grid`, `/admin`, `/drilldown`, `/view_by_date` | URLs pages |

Types: `src/lib/types/{timesheets,screenshots,activity}.ts`.

## Tests

`npm test` — `tests/api-contract.test.ts` (dashboard + screenshots shape), `tests/timesheets.test.ts` (shapes + add / edit /
split / delete / bulk-delete round trips incl. Dashboard totals), `tests/activity.test.ts` (screenshots delete → deleted →
restore, app usage, URLs, timezone list, saved filters).
`npm run test:e2e` — `e2e/{dashboard,shell,timesheets,screenshots,apps-urls}.spec.ts`.
`npm run screens` — `e2e/screens*.spec.ts`; batch 1 captures go to `docs/replica-screens/batch1/` (1920×945 at 0.8167 → 1568×772, comparable with the live captures).

## Batch 1 fidelity notes / gaps

- **Exports**: "Export as Excel" downloads a locally generated **CSV**; Timesheets "Export as PDF" returns a simple
  generated PDF; URL "Export as PDF" / "Send Report" only show a toast (the live code does nothing here either).
- **Deleted Screenshots**: the live table has no row actions; the Restore / Delete permanently row menu, checkboxes and bulk
  bar are a **replica extension** wired to the live registry endpoints. Restore works per deletion group (the whole slot).
  Deleting time on the Timesheets page does not create Deleted-Screenshot records.
- **Bulk download** shows the live dialog / flow, but no ZIP is produced.
- **Time off** is shown as a "Paid Time Off" full day (no populated live `time_off` sample was captured).
- **My URLs populated state** was built from the chunk markup (the live capture only had the empty state);
  `date_formatted` text format is a guess. Alert cells on the All URLs grid are tinted red (live does not tint them);
  only `youtube.com` counts as an alert domain (`seed-activity.ts`).
- **Appearance** background scenes: only the rocket / satellite SVGs were captured; the other scene images are simple
  placeholders. Light mode depends on the compiled live CSS.
- `captured_at_user_tz` carries a zone suffix ("… 09:09:22 AM EDT"); the live sample showed no suffix.
- Page bodies render client-side only (after mount) so "today" is always the browser's day; a minor React text-hydration
  warning (#418) may still appear in the console on some pages (React recovers; no visual effect).
- Toast styling (react-hot-toast, top-center) is a best guess.

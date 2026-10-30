import { test, expect, type Page } from "@playwright/test";

/**
 * Replica screenshots of Activity › App and Activity › URLs (My URLs + All URLs) for comparison with
 * the live captures (1920x945 CSS px rendered at 0.8167 → 1568x772 images).
 * Output: docs/replica-screens/batch1/apps-*.png, urls-*.png   Run: npm run screens
 */
const DIR = "docs/replica-screens/batch1";
const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const daysAgo = (n: number) => ymd(new Date(Date.now() - n * 86_400_000));

async function shot(page: Page, name: string) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${DIR}/${name}.png` });
}

test.use({ viewport: { width: 1920, height: 945 }, deviceScaleFactor: 1568 / 1920 });

test.beforeEach(async ({ request }) => {
  await request.post("/api/__reset");
});

/** A recent weekday with data for the demo user. */
function lastWeekday() {
  for (let n = 1; n < 6; n++) {
    const d = new Date(Date.now() - n * 86_400_000);
    const wd = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" })).getDay();
    if (wd !== 0 && wd !== 6) return daysAgo(n);
  }
  return daysAgo(1);
}

test("apps states", async ({ page, context }) => {
  const date = lastWeekday();
  await page.goto(`/organizations/3/activities/apps?scenario=empty&latency=0`);
  await expect(page.getByText("No Activity Recorded")).toBeVisible();
  await shot(page, "apps-empty");
  await context.clearCookies();

  await page.goto(`/organizations/3/activities/apps?date=${date}&scenario=default&latency=0`);
  await expect(page.getByTestId("timeline-hour").first()).toBeVisible();
  await shot(page, "apps-populated");
  await page.locator(".recharts-pie-sector").first().hover();
  await shot(page, "apps-pie-tooltip");
  await page.getByTestId("main-scroll").evaluate((el) => el.scrollTo(0, 700));
  await shot(page, "apps-timeline-scrolled");
  await page.getByTestId("main-scroll").evaluate((el) => el.scrollTo(0, 0));

  await page.getByTestId("filters-button").click();
  await shot(page, "apps-filters-open");
  await page.getByRole("switch", { name: "Project" }).click();
  await page.keyboard.press("Escape");
  await page.getByTestId("project-chip").click();
  await shot(page, "apps-filter-project-chip");
  await page.keyboard.press("Escape");
  await page.getByTestId("date-picker").click();
  await shot(page, "apps-date-picker");
  await page.keyboard.press("Escape");
  await page.getByTestId("member-select").click();
  await shot(page, "apps-member-selector");
});

test("my urls states", async ({ page, context }) => {
  await page.goto(`/organizations/3/activities/urls?scenario=empty&latency=0`);
  await expect(page.getByTestId("urls-empty")).toBeVisible();
  await shot(page, "urls-my-empty");
  await context.clearCookies();
  await page.goto(`/organizations/3/activities/urls?scenario=default&latency=0`);
  await page.getByTestId("url-day-trigger").first().click();
  await expect(page.getByTestId("domain-row").first()).toBeVisible();
  await shot(page, "urls-my-populated");
  await page.getByTestId("urls-actions").click();
  await shot(page, "urls-my-actions-menu");
  await page.keyboard.press("Escape");
  await page.getByTestId("date-range-trigger").click();
  await shot(page, "urls-my-date-range-picker");
});

test("all urls states", async ({ page }) => {
  const base = `/organizations/3/activities/urls/admin_view`;
  await page.goto(`${base}?latency=0`);
  await expect(page.getByTestId("grid-cell").first()).toBeVisible();
  await shot(page, "urls-admin-week");
  await page.getByTestId("grid-cell").first().click();
  await expect(page.getByTestId("url-sheet").getByTestId("domain-row").first()).toBeVisible();
  await shot(page, "urls-admin-url-sheet");
  await page.getByTestId("url-sheet").locator("button[data-testid=domain-row]").first().click();
  await shot(page, "urls-admin-url-sheet-domain-expanded");
  await page.keyboard.press("Escape");

  await page.getByTestId("filters-button").click();
  await shot(page, "urls-admin-filters-open");
  await page.keyboard.press("Escape");
  await page.getByTestId("urls-actions").click();
  await shot(page, "urls-admin-actions-menu");
  await page.keyboard.press("Escape");

  await page.goto(`${base}?view=day&start_date=${ymd(new Date(Date.now() + 86_400_000 * 0))}&end_date=${ymd(new Date())}&scenario=empty&latency=0`);
  await expect(page.getByText("No data found.")).toBeVisible();
  await shot(page, "urls-admin-day-empty");
  await page.context().clearCookies();
  const d = lastWeekday();
  await page.goto(`${base}?view=day&start_date=${d}&end_date=${d}&scenario=default&latency=0`);
  await expect(page.getByTestId("grid-cell").first()).toBeVisible();
  await shot(page, "urls-admin-day-view");
  await page.getByTestId("date-picker").click();
  await shot(page, "urls-admin-date-picker");
  await page.keyboard.press("Escape");

  await page.getByTestId("view-month").click();
  await expect(page.getByTestId("grid-cell").first()).toBeVisible();
  await shot(page, "urls-admin-month-view");
  await page.getByTestId("view-year").click();
  await expect(page.getByTestId("grid-cell").first()).toBeVisible();
  await shot(page, "urls-admin-year-view");
  await page.getByTestId("grid-cell").first().click();
  await expect(page.getByTestId("drilldown-day").first()).toBeVisible();
  await shot(page, "urls-admin-year-cell-sheet");
  await page.getByTestId("drilldown-day").first().locator("button").first().click();
  await expect(page.getByTestId("drilldown-day").first().getByTestId("domain-row").first()).toBeVisible();
  await shot(page, "urls-admin-year-cell-sheet-day-expanded");
  await page.keyboard.press("Escape");
  await page.getByTestId("date-range-trigger").click();
  await shot(page, "urls-admin-year-date-range-picker");
});

import { test, expect } from "@playwright/test";

/** Activity › App, Activity › URLs (My URLs) and URLs › All URLs (URL management). */
const APPS = "/organizations/3/activities/apps";
const MY = "/organizations/3/activities/urls";
const ADMIN = "/organizations/3/activities/urls/admin_view";

test.beforeEach(async ({ request }) => {
  await request.post("/api/__reset");
});

function lastWeekday() {
  for (let n = 1; n < 6; n++) {
    const ny = new Date(Date.now() - n * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const wd = new Date(`${ny}T12:00:00Z`).getUTCDay();
    if (wd !== 0 && wd !== 6) return ny;
  }
  return "";
}

test("apps: donut, legend, project activities and hourly timeline", async ({ page }) => {
  await page.goto(`${APPS}?date=${lastWeekday()}&latency=0`);
  await expect(page).toHaveTitle("App Activities | TimeWorks");
  await expect(page.getByTestId("app-legend-item").first()).toBeVisible();
  await expect(page.getByTestId("app-legend-item")).toHaveCount(5);
  await expect(page.getByTestId("project-activity-row").first()).toBeVisible();
  await expect(page.getByTestId("timeline-hour").first()).toBeVisible();
  await page.getByTestId("date-prev").click();
  await expect(page).toHaveURL(/date=/);
});

test("apps: empty scenario", async ({ page, context }) => {
  await page.goto(`${APPS}?scenario=empty&latency=0`);
  await expect(page.getByText("No Activity Recorded")).toBeVisible();
  await context.clearCookies();
});

test("my urls: days expand to domains, export downloads, tab to All URLs", async ({ page }) => {
  await page.goto(`${MY}?latency=0`);
  const day = page.getByTestId("url-day").first();
  await expect(day).toBeVisible();
  await day.getByTestId("url-day-trigger").click();
  await expect(day.getByTestId("domain-row").first()).toBeVisible();
  await page.getByTestId("urls-actions").click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "Export as Excel" }).click()]);
  expect(dl.suggestedFilename()).toMatch(/\.csv$/);
  await page.getByTestId("main-scroll").getByRole("link", { name: "All URLs" }).click();
  await expect(page).toHaveURL(/admin_view/);
});

test("my urls: empty scenario", async ({ page, context }) => {
  await page.goto(`${MY}?scenario=empty&latency=0`);
  await expect(page.getByTestId("urls-empty")).toContainText("No URL activity found for the selected period.");
  await context.clearCookies();
});

test("all urls: week grid → cell sheet → domain expand; day/month/year views; drilldown", async ({ page }) => {
  await page.goto(`${ADMIN}?latency=0`);
  await expect(page.getByTestId("grid-cell").first()).toBeVisible();
  await page.getByTestId("grid-cell").first().click();
  const sheet = page.getByTestId("url-sheet");
  await expect(sheet).toBeVisible();
  await sheet.getByTestId("domain-row").first().click();
  await expect(sheet.getByTestId("url-row").first()).toBeVisible();
  await page.keyboard.press("Escape");

  for (const v of ["day", "month", "year"]) {
    await page.getByTestId(`view-${v}`).click();
    await expect(page).toHaveURL(new RegExp(`view=${v}`));
    await expect(page.getByTestId("url-grid")).toBeVisible();
  }
  await page.getByTestId("grid-cell").first().click();
  await expect(page.getByTestId("drilldown-day").first()).toBeVisible();
});

test("all urls: employee search filters rows", async ({ page }) => {
  await page.goto(`${ADMIN}?latency=0`);
  await expect(page.getByTestId("grid-cell").first()).toBeVisible();
  await page.getByTestId("employee-search").locator("input").or(page.getByPlaceholder("Search employee...")).first().fill("Priya");
  await expect(page.getByTestId("url-grid")).toContainText("Priya Raman");
  await expect(page.getByTestId("url-grid")).not.toContainText("Marcus Bell");
});

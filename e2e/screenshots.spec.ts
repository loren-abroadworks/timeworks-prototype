import { test, expect, type Page } from "@playwright/test";

/**
 * Activity › Screenshots and Activity › Deleted Screenshots:
 * page states, filters, 10 min / All, lightbox, delete slot → Deleted Screenshots → restore.
 */
const SS = "/organizations/3/activities/screenshots";
const DEL = "/organizations/3/activities/deleted_screenshots";
const TS = "/organizations/3/timesheets/view_edit";

test.beforeEach(async ({ request }) => {
  await request.post("/api/__reset");
});

/** A recent weekday (New York calendar) — the demo user always has tracked time then. */
function lastWeekday() {
  for (let n = 1; n < 6; n++) {
    const d = new Date(Date.now() - n * 86_400_000);
    const ny = d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const wd = new Date(`${ny}T12:00:00Z`).getUTCDay();
    if (wd !== 0 && wd !== 6) return ny;
  }
  return "";
}

async function openDay(page: Page, date: string, extra = "") {
  await page.goto(`${SS}?date=${date}&latency=0${extra}`);
  await expect(page.getByTestId("slot-card").first()).toBeVisible();
}

const benchmark = (page: Page, label: string) => page.getByTestId("benchmark").filter({ hasText: label }).getByTestId("benchmark-value");

test("populated day: benchmarks, hour groups, All view and lightbox", async ({ page }) => {
  await openDay(page, lastWeekday());
  await expect(page).toHaveTitle("Screenshot Activities | TimeWorks");
  await expect(page.getByTestId("hour-group").first()).toBeVisible();
  await expect(benchmark(page, "Worked Time")).toHaveText(/\d+:\d{2}:\d{2}/);

  await page.getByTestId("slot-card").first().hover();
  await page.getByTestId("slot-view").first().click();
  const lb = page.getByTestId("screenshot-lightbox");
  await expect(lb).toBeVisible();
  await expect(page.getByTestId("lightbox-counter")).toContainText("1 /");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("lightbox-counter")).toContainText("2 /");
  await page.keyboard.press("Escape");
  await expect(lb).toBeHidden();

  await page.getByRole("tab", { name: "All" }).click();
  await expect(page).toHaveURL(/view=all_records/);
  await expect(page.getByTestId("slot-card").first()).toBeVisible();
});

test("empty scenario shows the empty state", async ({ page, context }) => {
  await page.goto(`${SS}?scenario=empty&latency=0`);
  await expect(page.getByTestId("screenshots-empty")).toContainText("No screenshots for the selected date");
  await context.clearCookies();
});

test("Time Type filter chip narrows the slots", async ({ page }) => {
  await openDay(page, lastWeekday());
  const all = await page.getByTestId("slot-card").count();
  await page.getByTestId("filters-button").click();
  await page.getByTestId("filters-popover").getByRole("switch", { name: "Time Type" }).click();
  await page.keyboard.press("Escape");
  await page.getByTestId("time-type-chip").click();
  await page.getByTestId("time-type-chip-popover").getByRole("option", { name: "Idle" }).click();
  await page.keyboard.press("Escape");
  await expect.poll(() => page.getByTestId("slot-card").count()).toBeLessThan(all);
});

test("delete a slot → it is listed in Deleted Screenshots → restore brings it back", async ({ page, request }) => {
  const date = lastWeekday();
  await openDay(page, date);
  const before = await benchmark(page, "Total Slots").textContent();
  const card = page.getByTestId("slot-card").first();
  await card.hover();
  await card.getByTestId("slot-select").click();
  await expect(page.getByTestId("selection-bar")).toContainText("1 slot selected");
  await page.getByTestId("selection-delete").click();
  const dlg = page.getByTestId("delete-slots-dialog");
  await dlg.locator("textarea").fill("E2E: personal browsing");
  await page.getByTestId("delete-slots-confirm").click();
  await expect(dlg).toBeHidden();
  await expect(benchmark(page, "Total Slots")).not.toHaveText(before ?? "");

  await page.goto(`${DEL}?latency=0`);
  const row = page.getByTestId("deleted-row").filter({ hasText: "E2E: personal browsing" }).first();
  await expect(row).toBeVisible();
  await row.getByTestId("row-menu").click();
  await page.getByTestId("row-restore").click();
  await expect(page.getByTestId("deleted-row").filter({ hasText: "E2E: personal browsing" })).toHaveCount(0);

  await openDay(page, date);
  await expect(benchmark(page, "Total Slots")).toHaveText(before ?? "");
  expect((await request.get(`/api/v1/audit/deleted-screenshots/3?page=1&page_size=10&latency=0`)).ok()).toBeTruthy();
  void TS;
});

test("deleted screenshots: table, pagination and Excel export", async ({ page }) => {
  await page.goto(`${DEL}?latency=0`);
  await expect(page.getByTestId("deleted-row").first()).toBeVisible();
  await expect(page.getByTestId("pagination")).toBeVisible();
  await page.getByTestId("deleted-export").click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: /Export Excel/ }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx)$/);
});

test("bulk download dialog opens from the actions menu", async ({ page }) => {
  await openDay(page, lastWeekday());
  await page.getByTestId("screenshots-actions").click();
  await page.getByRole("menuitem", { name: "Bulk Download Screenshots" }).click();
  await expect(page.getByTestId("bulk-download-dialog")).toBeVisible();
});

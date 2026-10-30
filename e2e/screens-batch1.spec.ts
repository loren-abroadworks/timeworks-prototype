import { test, expect, type Page } from "@playwright/test";

/**
 * Batch 1 replica screenshots (shell, Timesheets, Screenshots, Deleted Screenshots) for comparison with
 * the live captures: 1920x945 CSS px at 0.8167 → 1568x772 images like the live ones.
 * Output: docs/replica-screens/batch1/{shell,timesheets,screenshots,deleted}-*.png   Run: npm run screens
 */
const DIR = "docs/replica-screens/batch1";
const USER = "0f9c2a71-5b3e-7d41-9a6c-2e8b4d1f7a30";
const TS = "/organizations/3/timesheets/view_edit";
const SS = "/organizations/3/activities/screenshots";
const DEL = "/organizations/3/activities/deleted_screenshots";

test.use({ viewport: { width: 1920, height: 945 }, deviceScaleFactor: 1568 / 1920 });
test.beforeEach(async ({ request }) => {
  await request.post("/api/__reset");
});

async function shot(page: Page, name: string) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${DIR}/${name}.png` });
}
function lastWeekday() {
  for (let n = 1; n < 6; n++) {
    const ny = new Date(Date.now() - n * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    if (![0, 6].includes(new Date(`${ny}T12:00:00Z`).getUTCDay())) return ny;
  }
  return "";
}

test("shell states", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(`/dashboard/${USER}/my_dashboard?latency=0`);
  await expect(page.getByTestId("stat-value").first()).toBeVisible();
  await page.evaluate(() => localStorage.removeItem("sidebar_state"));
  await page.reload();
  await expect(page.getByTestId("stat-value").first()).toBeVisible();
  await shot(page, "shell-sidebar-collapsed");
  await page.getByTitle("Activity", { exact: true }).click();
  await shot(page, "shell-collapsed-activity-flyout");
  await page.keyboard.press("Escape");
  await page.getByTitle("Settings", { exact: true }).click();
  await shot(page, "shell-collapsed-settings-flyout");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+b");
  await shot(page, "shell-sidebar-expanded");
  await page.getByText("Acme Remote Co.").first().click();
  await shot(page, "shell-org-switcher");
  await page.keyboard.press("Escape");
  await page.getByTestId("main-scroll").getByTestId("user-chip").click();
  await shot(page, "shell-profile-menu");
  await page.getByRole("menuitem", { name: "Appearance" }).click();
  await shot(page, "shell-appearance-dialog");
  await page.keyboard.press("Escape");
  await page.getByTestId("main-scroll").getByTestId("user-chip").click();
  await page.getByRole("menuitem", { name: "Report a Bug" }).click();
  await shot(page, "shell-report-bug-dialog");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+b");
});

test("timesheets states", async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.goto(`${TS}?latency=0`);
  await expect(page.getByTestId("day-card").first()).toBeVisible();
  await shot(page, "timesheets-default");
  const card = page.getByTestId("day-card").nth(1);
  await card.getByTestId("day-header").click();
  await expect(card.getByTestId("entries-table")).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await shot(page, "timesheets-day-expanded-entries");
  await card.getByTestId("timeline-segment").first().hover();
  await shot(page, "timesheets-timeline-tooltip");
  await card.getByTestId("entry-actions").first().click();
  await shot(page, "timesheets-entry-action-menu");
  await page.getByRole("menuitem", { name: "Edit Time Entry" }).click();
  await shot(page, "timesheets-edit-time-dialog");
  await page.keyboard.press("Escape");
  await card.getByTestId("entry-actions").first().click();
  await page.getByRole("menuitem", { name: "Split Time Entry" }).click();
  await shot(page, "timesheets-split-time-dialog");
  await page.keyboard.press("Escape");
  await card.getByTestId("entry-actions").first().click();
  await page.getByRole("menuitem", { name: "Delete Time Entry" }).click();
  await shot(page, "timesheets-delete-time-dialog");
  await page.keyboard.press("Escape");
  await card.getByTestId("entry-row").first().getByRole("checkbox").click();
  await shot(page, "timesheets-bulk-selected");
  await page.getByTestId("header-add-time").click();
  await shot(page, "timesheets-add-time-dialog");
  await page.keyboard.press("Escape");
  await page.getByTestId("main-scroll").evaluate((el) => el.scrollTo(0, 0));
  await page.getByTestId("filters-button").click();
  await shot(page, "timesheets-filters-open");
  await page.keyboard.press("Escape");
  await page.getByTestId("member-select").click();
  await shot(page, "timesheets-member-selector");
  await page.keyboard.press("Escape");
  await page.getByTestId("timezone-select").click();
  await shot(page, "timesheets-timezone-selector");
  await page.keyboard.press("Escape");
  await page.getByTestId("export-menu").click();
  await shot(page, "timesheets-export-menu");
  await page.keyboard.press("Escape");
  await page.getByTestId("week-toggle").click();
  await shot(page, "timesheets-week-summary-collapsed");
  await page.goto(`${TS}?scenario=empty&latency=0`);
  await expect(page.getByTestId("day-card").first()).toBeVisible();
  await shot(page, "timesheets-empty");
  await context.clearCookies();
});

test("screenshots + deleted states", async ({ page, context }) => {
  test.setTimeout(120_000);
  const day = lastWeekday();
  await page.goto(`${SS}?date=${day}&latency=0`);
  await expect(page.getByTestId("slot-card").first()).toBeVisible();
  await shot(page, "screenshots-10min-populated");
  const card = page.getByTestId("slot-card").first();
  await card.hover();
  await shot(page, "screenshots-card-hover");
  await card.getByTestId("slot-select").click();
  await shot(page, "screenshots-slot-selected");
  await page.getByTestId("selection-delete").click();
  await shot(page, "screenshots-delete-slot-dialog");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByTestId("slot-card").first()).toBeVisible();
  await page.getByTestId("slot-card").first().hover();
  await page.getByTestId("slot-view").first().click();
  await shot(page, "screenshots-lightbox");
  await page.keyboard.press("Escape");
  const badge = page.getByTestId("detection-badge").first();
  if (await badge.count()) {
    await badge.click();
    await shot(page, "screenshots-detection-details-dialog");
    await page.keyboard.press("Escape");
  }
  await page.getByTestId("filters-button").click();
  await shot(page, "screenshots-filters-open");
  await page.keyboard.press("Escape");
  await page.getByTestId("screenshots-actions").click();
  await shot(page, "screenshots-actions-menu");
  await page.getByRole("menuitem", { name: "Bulk Download Screenshots" }).click();
  await shot(page, "screenshots-bulk-download-dialog");
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "All" }).click();
  await expect(page.getByTestId("slot-card").first()).toBeVisible();
  await shot(page, "screenshots-all-view");
  await page.goto(`${SS}?scenario=empty&latency=0`);
  await expect(page.getByTestId("screenshots-empty")).toBeVisible();
  await shot(page, "screenshots-empty");
  await context.clearCookies();

  await page.goto(`${DEL}?latency=0`);
  await expect(page.getByTestId("deleted-row").first()).toBeVisible();
  await shot(page, "deleted-default");
  await page.getByTestId("deleted-thumb").first().click();
  await shot(page, "deleted-viewer");
  await page.keyboard.press("Escape");
  await page.getByTestId("deleted-export").click();
  await shot(page, "deleted-export-menu");
  await page.keyboard.press("Escape");
  await page.getByTestId("filters-button").click();
  await shot(page, "deleted-filters-open");
  await page.keyboard.press("Escape");
});

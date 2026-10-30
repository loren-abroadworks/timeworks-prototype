import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * Timesheets › View & Edit — loads, filters, member switch, range nav, export, and the
 * add / edit / split / delete / bulk-delete round trips (writes hit the mock API and totals recompute).
 */
const URL = "/organizations/3/timesheets/view_edit";

test.beforeEach(async ({ request }) => {
  await request.post("/api/__reset");
});

const toSec = (t: string) => {
  const [h, m, s] = t.trim().split(":").map(Number);
  return h * 3600 + m * 60 + s;
};
const stat = (page: Page, label: string) => page.getByTestId("ts-stat").filter({ hasText: label }).getByTestId("ts-stat-value");
const worked = async (page: Page) => toSec((await stat(page, "Total Time Worked").textContent()) ?? "0:0:0");

async function open(page: Page, url = URL) {
  await page.goto(`${url}${url.includes("?") ? "&" : "?"}latency=0`);
  await expect(page.getByTestId("day-card").first()).toBeVisible();
  await expect(stat(page, "Total Time Worked")).not.toHaveText("");
}

/** A past day card (not today) that has tracked time. */
async function pastDayWithTime(page: Page): Promise<Locator> {
  const cards = page.getByTestId("day-card");
  const n = await cards.count();
  for (let i = 1; i < n; i++) {
    const c = cards.nth(i);
    const t = (await c.getByTestId("day-header").textContent()) ?? "";
    if (/Time Worked\s*(?!00:00:00)\d{1,2}:\d{2}:\d{2}/.test(t)) return c;
  }
  throw new Error("no past day with time");
}

async function expand(card: Locator) {
  if ((await card.getByTestId("day-header").getAttribute("aria-expanded")) !== "true") await card.getByTestId("day-header").click();
  await expect(card.getByTestId("entries-table")).toBeVisible();
}

test("loads member card, stats, week table and day cards", async ({ page }) => {
  await open(page);
  await expect(page).toHaveTitle("Timesheets | TimeWorks");
  await expect(page.getByTestId("ts-member-name")).toContainText("Jordan");
  await expect(page.getByTestId("week-table")).toBeVisible();
  await expect(page.getByTestId("day-card")).toHaveCount(7);
  const card = await pastDayWithTime(page);
  await expand(card);
  await expect(card.getByTestId("entry-row").first()).toBeVisible();
  await expect(card.getByTestId("timeline-segment").first()).toBeVisible();
});

test("range navigation and member switch change the data", async ({ page }) => {
  await open(page);
  const before = await page.getByTestId("week-table").textContent();
  await page.getByTestId("range-prev").click();
  await expect(page).toHaveURL(/start_date=/);
  await expect(page.getByTestId("week-table")).not.toHaveText(before ?? "");
  await page.getByTestId("member-select").click();
  await page.getByTestId("member-select-popover").getByText("Priya Raman").click();
  await expect(page.getByTestId("ts-member-name")).toContainText("Priya");
  await expect(page).toHaveURL(/user_id=/);
});

test("filters: Time Type chip filters entries", async ({ page }) => {
  await open(page);
  await page.getByTestId("filters-button").click();
  await page.getByTestId("filters-popover").getByRole("switch", { name: "Time Type" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("time-type-chip")).toBeVisible();
  const total = await worked(page);
  await page.getByTestId("time-type-chip").click();
  await page.getByTestId("time-type-chip-popover").getByRole("option", { name: /idle/i }).click();
  await expect.poll(() => worked(page)).toBeLessThan(total);
});

test("add → edit → delete a time entry updates totals", async ({ page }) => {
  await open(page);
  const total = await worked(page);
  const card = await pastDayWithTime(page);
  await card.getByTestId("day-add-time").click();
  const add = page.getByTestId("add-time-dialog");
  await expect(add).toBeVisible();
  await add.getByTestId("project-select").click();
  await page.getByTestId("project-select-popover").getByRole("option").first().click();
  await add.getByTestId("add-from").fill("02:00");
  await add.getByTestId("add-to").fill("03:00");
  await add.getByRole("button", { name: "Save" }).click();
  await expect(add).toBeHidden();
  await expect.poll(() => worked(page)).toBe(total + 3600);

  await expand(card);
  const row = card.getByTestId("entry-row").filter({ hasText: "02:00:00 AM" });
  await row.getByTestId("entry-actions").click();
  await page.getByRole("menuitem", { name: "Edit Time Entry" }).click();
  const edit = page.getByTestId("edit-time-dialog");
  await edit.getByTestId("edit-to").fill("02:30");
  await edit.locator("textarea").fill("Shortened in E2E");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(edit).toBeHidden();
  await expect.poll(() => worked(page)).toBe(total + 1800);

  await card.getByTestId("entry-row").filter({ hasText: "02:00:00 AM" }).getByTestId("entry-actions").click();
  await page.getByRole("menuitem", { name: "Delete Time Entry" }).click();
  const del = page.getByTestId("delete-time-dialog");
  await del.locator("textarea").fill("Added by mistake");
  await del.getByRole("button", { name: "Delete" }).click();
  await expect(del).toBeHidden();
  await expect.poll(() => worked(page)).toBe(total);
});

test("split a tracked entry keeps the total and adds a row", async ({ page }) => {
  await open(page);
  const total = await worked(page);
  const card = await pastDayWithTime(page);
  await expand(card);
  const rows = card.getByTestId("entry-row");
  const count = await rows.count();
  const span = (await rows.first().getByTestId("entry-time").textContent()) ?? "";
  const to24 = (t: string) => {
    const [, hh, mm, ss, ap] = /(\d+):(\d+):(\d+) (AM|PM)/.exec(t)!;
    return ((Number(hh) % 12) + (ap === "PM" ? 12 : 0)) * 3600 + Number(mm) * 60 + Number(ss);
  };
  const [a, b] = span.split(" - ").map(to24);
  const mid = Math.floor((a + b) / 2);
  const hms = [Math.floor(mid / 3600), Math.floor((mid % 3600) / 60), mid % 60].map((n) => String(n).padStart(2, "0")).join(":");
  await rows.first().getByTestId("entry-actions").click();
  await page.getByRole("menuitem", { name: "Split Time Entry" }).click();
  const split = page.getByTestId("split-time-dialog");
  await expect(split.getByTestId("split-card")).toHaveCount(2);
  await split.getByTestId("split-to-0").fill(hms);
  await split.getByTestId("split-from-1").fill(hms);
  await split.locator("textarea").fill("Split in E2E");
  await split.getByRole("button", { name: "Save" }).click();
  await expect(split).toBeHidden();
  await expect(rows).toHaveCount(count + 1);
  expect(await worked(page)).toBe(total);
});

test("bulk delete selected entries of a day", async ({ page }) => {
  await open(page);
  const total = await worked(page);
  const card = await pastDayWithTime(page);
  await expand(card);
  await card.getByTestId("entry-row").first().getByRole("checkbox").click();
  await expect(page.getByTestId("bulk-bar")).toContainText("1 entry selected");
  await page.getByTestId("bulk-delete").click();
  const dlg = page.getByTestId("bulk-delete-dialog");
  await dlg.locator("textarea").fill("Bulk cleanup");
  await dlg.getByRole("button", { name: "Delete" }).click();
  await expect(dlg).toBeHidden();
  await expect.poll(() => worked(page)).toBeLessThan(total);
});

test("export as Excel downloads a CSV", async ({ page }) => {
  await open(page);
  await page.getByTestId("export-menu").click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "Export as Excel" }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});

test("empty scenario shows empty days", async ({ page, context }) => {
  await page.goto(`${URL}?scenario=empty&latency=0`);
  await expect(page.getByTestId("day-card").first()).toBeVisible();
  await expect(stat(page, "Total Time Worked")).toHaveText("00:00:00");
  await context.clearCookies();
});

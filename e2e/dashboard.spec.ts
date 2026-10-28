import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end tests for the Dashboard replica (both tabs).
 * Run: npm run test:e2e   (builds + starts the app on http://localhost:4317 if it is not running)
 */
const USER = "0f9c2a71-5b3e-7d41-9a6c-2e8b4d1f7a30";
const MY = `/dashboard/${USER}/my_dashboard`;
const MANAGER = `/dashboard/${USER}/manager_view`;

/** Navigate and wait until React has hydrated and the first data has arrived (clicks before hydration are lost). */
async function open(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByTestId("stat-value").first()).toBeVisible();
}

/** Scroll the main area to the bottom until the lazily-loaded Manager View widgets have data. */
async function scrollToLowerWidgets(page: Page) {
  await expect(async () => {
    await page.getByTestId("main-scroll").evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(page.getByTestId("members-card").getByRole("button", { name: "View All" })).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20_000 });
}

const statValue = (page: Page, title: string) => page.getByTestId("stat-card").filter({ hasText: title }).getByTestId("stat-value");

test.describe("My Dashboard", () => {
  test("loads stats, apps, projects and screenshots", async ({ page }) => {
    await open(page, MY);
    await expect(page).toHaveTitle("Dashboard | TimeWorks");
    await expect(page.getByTestId("main-scroll").getByTestId("user-chip")).toContainText("Jordan Avery");
    await expect(page.getByTestId("main-scroll").getByTestId("user-chip")).toContainText("Owner");
    await expect(statValue(page, "Average Activity")).toHaveText(/^\d+\.\d{2}%$/);
    await expect(statValue(page, "Total Worked Time")).toHaveText(/^\d{2,}:\d{2}:\d{2}$/);
    await expect(page.getByTestId("top-apps-card").getByTestId("app-usage-row")).toHaveCount(5);
    await expect(page.getByTestId("projects-tasks-card").getByText("|").first()).toBeVisible();
    await expect(page.getByTestId("screenshot-group")).toHaveCount(2);
  });

  test("Top Apps tabs filter apps vs URLs", async ({ page }) => {
    await open(page, MY);
    const card = page.getByTestId("top-apps-card");
    await card.getByRole("tab", { name: "URLs" }).click();
    const rows = card.getByTestId("app-usage-row");
    await expect(rows.first()).toContainText(/\.(com|org|app|example)/);
    await card.getByRole("tab", { name: "Apps" }).click();
    await expect(rows.first()).not.toContainText(".com");
  });

  test("Total Payment is blurred until clicked", async ({ page }) => {
    await open(page, MY);
    const value = statValue(page, "Total Payment");
    await expect(value).toHaveClass(/blur-sm/);
    await value.click();
    await expect(value).not.toHaveClass(/blur-sm/);
    await page.getByText("Top Apps & URL's").click(); // click outside re-blurs
    await expect(value).toHaveClass(/blur-sm/);
  });

  test("date navigation changes the numbers", async ({ page }) => {
    await open(page, MY);
    const worked = statValue(page, "Total Worked Time");
    await expect(worked).toHaveText(/\d/);
    const before = await worked.textContent();
    await expect(page.getByTestId("date-next")).toBeDisabled();

    await page.getByTestId("date-prev").click();
    await expect(page).toHaveURL(/start_date=\d{4}-\d{2}-\d{2}&end_date=\d{4}-\d{2}-\d{2}/);
    await expect(worked).not.toHaveText(before!);
    await expect(page.getByTestId("date-next")).toBeEnabled();

    await page.getByTestId("date-next").click();
    await expect(worked).toHaveText(before!);
    await expect(page.getByTestId("date-next")).toBeDisabled();
  });

  test("date picker quick select applies a preset", async ({ page }) => {
    await open(page, MY);
    await page.getByTestId("date-range-trigger").click();
    await page.getByRole("button", { name: "Last 7 Days" }).click();
    await expect(page).toHaveURL(/start_date=/);
    const url = new URL(page.url());
    const start = new Date(url.searchParams.get("start_date")!);
    const end = new Date(url.searchParams.get("end_date")!);
    expect(Math.round((end.getTime() - start.getTime()) / 86_400_000)).toBe(6);
  });

  test("Top Apps 'View All' sheet paginates and searches", async ({ page }) => {
    await open(page, MY);
    await page.getByTestId("top-apps-view-all").click();
    const sheet = page.getByTestId("top-apps-sheet");
    await expect(sheet).toBeVisible();
    const panel = sheet.getByRole("tabpanel");
    await expect(panel.getByTestId("sheet-row")).toHaveCount(20);
    await expect(panel.getByTestId("sheet-page")).toHaveText("1 / 2");
    await expect(panel.getByTestId("sheet-range")).toHaveText(/Showing 1–20 of \d+ results/);

    await panel.getByRole("button", { name: "Next page" }).click();
    await expect(panel.getByTestId("sheet-page")).toHaveText("2 / 2");
    await expect(panel.getByTestId("sheet-range")).toHaveText(/Showing 21–\d+ of \d+ results/);

    await sheet.getByPlaceholder("Search...").fill("google");
    await expect(page).toHaveURL(/search=google/);
    await expect(panel.getByTestId("sheet-page")).toHaveText("1 / 1");
    const rows = panel.getByTestId("sheet-row");
    await expect(rows.first()).toContainText("google");
    for (const text of await rows.allTextContents()) expect(text.toLowerCase()).toContain("google");

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });

  test("Projects & Task Tracking sheet filters by project", async ({ page }) => {
    await open(page, MY);
    await page.getByTestId("projects-tasks-card").getByRole("button", { name: "View All" }).click();
    const sheet = page.getByTestId("projects-tasks-sheet");
    await expect(sheet.getByTestId("sheet-row").first()).toBeVisible();
    await sheet.getByTestId("project-filter").click();
    await page.getByRole("option", { name: "Mobile App v2" }).click();
    await expect(sheet.getByTestId("project-filter")).toHaveText("Mobile App v2");
    const rows = sheet.getByTestId("sheet-row");
    await expect(rows.first()).toContainText("Mobile App v2");
    for (const text of await rows.allTextContents()) expect(text).toContain("Mobile App v2");
  });

  test("screenshot viewer opens, navigates with keyboard and closes", async ({ page }) => {
    await open(page, MY);
    await page.getByTestId("screenshot-thumb").first().click();
    const viewer = page.getByTestId("screenshot-viewer");
    await expect(viewer).toBeVisible();
    await expect(page.getByTestId("viewer-counter")).toHaveText(/Screenshot 01\/\d{2}/);
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("viewer-counter")).toHaveText(/Screenshot 02\/\d{2}/);
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("viewer-counter")).toHaveText(/Screenshot 01\/\d{2}/);
    await viewer.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByTestId("viewer-counter")).toHaveText(/Screenshot 02\/\d{2}/);
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
  });

  test("screenshot modes and group selection", async ({ page }) => {
    await open(page, MY);
    const section = page.getByTestId("recent-screenshots");
    await expect(section.getByTestId("screenshot-card").first()).toBeVisible();
    const tenMinuteCount = await section.getByTestId("screenshot-card").count();
    await section.getByRole("tab", { name: "All screenshots" }).click();
    await expect(async () => expect(await section.getByTestId("screenshot-card").count()).toBeGreaterThan(tenMinuteCount)).toPass();

    const groupBox = section.getByTestId("screenshot-group").first().getByRole("checkbox").first();
    await groupBox.click();
    await expect(groupBox).toHaveAttribute("data-state", "checked");
    // every card of the group now shows a checked checkbox
    const cardChecks = section.getByTestId("screenshot-group").first().getByTestId("screenshot-thumb").getByRole("checkbox");
    await expect(cardChecks.first()).toHaveAttribute("data-state", "checked");
  });

  test("empty scenario shows empty states", async ({ page }) => {
    await open(page, `${MY}?scenario=empty`);
    await expect(statValue(page, "Average Activity")).toHaveText("0.00%");
    await expect(statValue(page, "Total Worked Time")).toHaveText("00:00:00");
    await expect(page.getByText("No app or URL activity in this range")).toBeVisible();
    await expect(page.getByText("No recent activity")).toBeVisible();
  });
});

test.describe("Manager View", () => {
  test("tab switching between My Dashboard and Manager View", async ({ page }) => {
    await open(page, MY);
    await page.getByRole("tab", { name: "Manager View" }).click();
    await expect(page).toHaveURL(/\/manager_view$/);
    await expect(page.getByText("Company Activity")).toBeVisible();
    await expect(page).toHaveTitle("Team Dashboard | TimeWorks");
    await page.getByRole("tab", { name: "My Dashboard" }).click();
    await expect(page).toHaveURL(/\/my_dashboard$/);
    await expect(page.getByText("Average Activity")).toBeVisible();
  });

  test("loads KPIs, chart, tables and lazy secondary widgets", async ({ page }) => {
    await open(page, MANAGER);
    await expect(statValue(page, "Company Time Worked")).toHaveText(/^\d+:\d{2}:\d{2}$/);
    await expect(statValue(page, "Company Total Bill")).toHaveClass(/blur-sm/);
    await expect(page.getByTestId("performance-chart").locator(".recharts-surface")).toBeVisible();
    await expect(page.getByTestId("projects-clients-card").getByRole("row")).toHaveCount(7); // header + 6 projects
    await expect(page.getByTestId("top-employees-card").getByRole("row")).toHaveCount(6); // header + top 5

    await scrollToLowerWidgets(page);
    await expect(page.getByTestId("low-activity-card").getByRole("row").nth(1)).toBeVisible();
    await expect(page.getByTestId("members-card").getByRole("row")).toHaveCount(7);
    await expect(page.getByTestId("weekly-limits-card")).toContainText("/");
    await expect(page.getByTestId("daily-limits-card")).toContainText("/");
  });

  test("chart tooltip appears on hover", async ({ page }) => {
    await open(page, MANAGER);
    const surface = page.getByTestId("performance-chart").locator(".recharts-surface");
    await expect(surface).toBeVisible();
    const box = (await surface.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
    await expect(page.getByTestId("chart-tooltip")).toBeVisible();
    await expect(page.getByTestId("chart-tooltip")).toContainText("Time Worked");
  });

  test("date navigation changes company numbers", async ({ page }) => {
    await open(page, MANAGER);
    const worked = statValue(page, "Company Time Worked");
    await expect(worked).toHaveText(/\d/);
    const before = await worked.textContent();
    await page.getByTestId("date-prev").click();
    await expect(worked).not.toHaveText(before!);
  });

  test("Members 'View All' sheet with member filter", async ({ page }) => {
    await open(page, MANAGER);
    await scrollToLowerWidgets(page);
    await page.getByTestId("members-card").getByRole("button", { name: "View All" }).click();
    const sheet = page.getByTestId("members-sheet");
    await expect(sheet.getByTestId("sheet-row")).toHaveCount(8);
    await expect(sheet.getByTestId("sheet-range")).toHaveText("Showing 1–8 of 8 results");
    await sheet.getByTestId("member-filter").click();
    await page.getByRole("option", { name: "Liam Chen" }).click();
    await expect(sheet.getByTestId("sheet-row")).toHaveCount(1);
    await expect(sheet.getByTestId("sheet-row")).toContainText("Liam Chen");
  });

  test("Projects / Clients and Top Employees sheets open", async ({ page }) => {
    await open(page, MANAGER);
    await page.getByTestId("projects-clients-card").getByRole("button", { name: "View All" }).click();
    await expect(page.getByTestId("projects-clients-sheet").getByTestId("sheet-row")).toHaveCount(6);
    await page.keyboard.press("Escape");
    await page.getByTestId("top-employees-card").getByRole("button", { name: "View All" }).click();
    await expect(page.getByTestId("top-employees-sheet").getByTestId("sheet-row").first()).toBeVisible();
  });
});

test("sidebar links lead to the 'coming soon' page inside the shell", async ({ page }) => {
  await open(page, MY);
  await page.getByTitle("Timesheets").click();
  await page.getByRole("link", { name: "View & Edit" }).click();
  await expect(page).toHaveURL(/\/organizations\/3\/timesheets\/view_edit$/);
  await expect(page.getByTestId("coming-soon")).toBeVisible();
});

import { test, expect, type Page } from "@playwright/test";

/**
 * App shell: sidebar (collapsed flyouts, expanded accordion, persistence), org switcher,
 * profile menu, Appearance and Report a Bug dialogs.
 */
const USER = "0f9c2a71-5b3e-7d41-9a6c-2e8b4d1f7a30";
const DASH = `/dashboard/${USER}/my_dashboard`;

test.beforeEach(async ({ request, page }) => {
  await request.post("/api/__reset");
  // Start every test collapsed, dark, default accent.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("__shell_init")) {
      localStorage.clear();
      sessionStorage.setItem("__shell_init", "1");
    }
  });
});

async function open(page: Page, url = DASH) {
  await page.goto(url);
  await expect(page.getByTestId("sidebar-menu")).toBeVisible({ timeout: 45_000 });
}

const sidebar = (page: Page) => page.getByTestId("app-sidebar");

test.describe("sidebar", () => {
  test("collapsed by default; flyout lists the section's pages and navigates", async ({ page }) => {
    await open(page);
    await expect(sidebar(page)).toHaveAttribute("data-state", "collapsed");
    await sidebar(page).getByTitle("Activity", { exact: true }).click();
    const flyout = page.getByTestId("nav-flyout");
    await expect(flyout).toContainText("Activity");
    await expect(flyout.getByRole("link")).toHaveText(["Screenshots", "App", "URLs", "Deleted Screenshots"]);
    await flyout.getByRole("link", { name: "Deleted Screenshots" }).click();
    await expect(page).toHaveURL(/\/organizations\/3\/activities\/deleted_screenshots/);
    await expect(sidebar(page).getByTitle("Activity", { exact: true })).toHaveAttribute("data-active", "true");
  });

  test("settings flyout shows ORGANIZATION / EMPLOYEES groups", async ({ page }) => {
    await open(page);
    await sidebar(page).getByTitle("Settings", { exact: true }).click();
    const flyout = page.getByTestId("nav-flyout");
    await expect(flyout.getByText("Organization", { exact: true })).toBeVisible();
    await expect(flyout.getByText("Employees", { exact: true })).toBeVisible();
    await expect(flyout.getByRole("link")).toHaveText([
      "Roles",
      "Team Permissions",
      "Audit Logs",
      "Security & Login",
      "Fraud Detection",
      "Time & Work Limits",
      "Tracking Rules",
      "HIPPA compliance",
    ]);
  });

  test("expand toggle shows labels, accordions and persists across reloads", async ({ page }) => {
    await open(page);
    await page.getByTestId("sidebar-toggle").click();
    await expect(sidebar(page)).toHaveAttribute("data-state", "expanded");
    const nav = page.getByTestId("sidebar-menu");
    await expect(nav.getByText("Project Management")).toBeVisible();
    // Sections start closed on the dashboard; several can be open at once.
    await nav.getByTestId("nav-time_sheets").click();
    await nav.getByTestId("nav-activity").click();
    await expect(nav.getByRole("link", { name: "View & Edit Timesheets" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Deleted Screenshots" })).toBeVisible();
    await nav.getByTestId("nav-settings").click();
    await nav.getByText("Employees", { exact: true }).click();
    await expect(nav.getByRole("link", { name: "HIPPA compliance" })).toHaveAttribute("href", "/organizations/3/settings/employee/hipaa_compliance");

    await page.reload();
    await expect(sidebar(page)).toHaveAttribute("data-state", "expanded");
    await page.keyboard.press("Control+b");
    await expect(sidebar(page)).toHaveAttribute("data-state", "collapsed");
  });

  test("expanded sidebar opens the active section and highlights the page", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("sidebar_state", "expanded"));
    await open(page, "/organizations/3/calendar/schedules");
    const nav = page.getByTestId("sidebar-menu");
    await expect(nav.getByTestId("nav-calendar")).toHaveAttribute("data-active", "true");
    await expect(nav.getByRole("link", { name: "Schedules" })).toHaveAttribute("data-active", "true");
    await expect(nav.getByRole("link", { name: "Timeoff Requests" })).toHaveAttribute("href", "/organizations/3/timeoff/requests");
    await expect(page.getByTestId("coming-soon")).toBeVisible();
  });
});

test("org switcher lists the organization and its actions", async ({ page }) => {
  await open(page);
  await page.getByTestId("org-switcher").click();
  const menu = page.getByTestId("org-switcher-menu");
  await expect(menu).toContainText("Acme Remote Co.");
  await expect(menu).toContainText("Manage organizations");
  await menu.getByText("Create organization").click();
  await expect(page).toHaveURL(/\/organizations\/create$/);
  await expect(page.getByTestId("coming-soon")).toBeVisible();
});

test("profile menu: items, links and sign-out toast", async ({ page }) => {
  await open(page);
  await page.getByTestId("main-scroll").getByTestId("user-chip").click();
  const menu = page.getByTestId("user-menu");
  await expect(menu.getByRole("menuitem")).toHaveText(["Profile", "Appearance", "Desktop App", "Help & FAQs", "Report a Bug", "Sign out"]);
  await menu.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByText("Sign out is disabled in the replica")).toBeVisible();
  await expect(menu).toBeHidden();
  await page.getByTestId("main-scroll").getByTestId("user-chip").click();
  await page.getByTestId("user-menu").getByRole("menuitem", { name: "Help & FAQs" }).click();
  await expect(page).toHaveURL(/\/faq$/);
});

test("appearance dialog switches theme, accent and scene and persists them", async ({ page }) => {
  await open(page);
  const html = page.locator("html");
  await expect(html).toHaveClass(/dark/);
  await page.getByTestId("main-scroll").getByTestId("user-chip").click();
  await page.getByTestId("user-menu").getByRole("menuitem", { name: "Appearance" }).click();
  const dialog = page.getByTestId("appearance-dialog");
  await expect(dialog).toContainText("Choose how TimeWorks looks");
  await dialog.getByRole("button", { name: "Light" }).click();
  await expect(html).toHaveAttribute("data-mode", "light");
  await dialog.getByRole("button", { name: "Emerald" }).click();
  await expect(html).toHaveAttribute("data-accent", "emerald");
  await dialog.getByTitle("Grid").click();
  await expect(html).toHaveAttribute("data-scene", "grid");
  await expect(dialog).toContainText("2px");
  await page.reload();
  await expect(html).toHaveAttribute("data-mode", "light");
  await expect(html).toHaveAttribute("data-accent", "emerald");
  await expect(html).toHaveAttribute("data-scene", "grid");
  await expect(html).toHaveAttribute("data-blur", "on");
});

test("report a bug: validation, then submit stores the report", async ({ page, request }) => {
  await open(page);
  await page.getByTestId("main-scroll").getByTestId("user-chip").click();
  await page.getByTestId("user-menu").getByRole("menuitem", { name: "Report a Bug" }).click();
  const dialog = page.getByTestId("report-bug-dialog");
  await expect(dialog.getByPlaceholder("Your name")).toHaveValue("Jordan Avery");
  await dialog.getByRole("button", { name: "Submit Report" }).click();
  await expect(dialog).toContainText("Summary is required");
  await expect(dialog).toContainText("Description is required");
  await dialog.getByPlaceholder("Briefly, what went wrong?").fill("Export button does nothing");
  await dialog.getByPlaceholder(/What happened/).fill("Clicked Export as PDF on Timesheets, nothing downloaded.");
  await dialog.getByRole("checkbox").click();
  await dialog.getByRole("button", { name: "Submit Report" }).click();
  await expect(page.getByText("Thanks! Your report has been submitted.")).toBeVisible();
  await expect(dialog).toBeHidden();
  const list = await (await request.get("/report-bug/submit")).json();
  const last = list.data[list.data.length - 1];
  expect(last.summary).toBe("Export button does nothing");
  expect(last.webInfo).toContain("Location:");
});

import { test, expect, type Page } from "@playwright/test";

/**
 * Captures replica screenshots for visual comparison with the live app.
 * The live reference screenshots are 1568x772 images of a ~1920px-wide browser window
 * (scaled down 0.8167x), so we render at 1920x945 CSS px with deviceScaleFactor 0.8167
 * to get a pixel-comparable 1568x772 image. A plain 1568x772 viewport capture is saved too.
 * Output: docs/replica-screens/*.png   Run: npm run screens
 */
const USER = "0f9c2a71-5b3e-7d41-9a6c-2e8b4d1f7a30";

async function scrollMainToBottom(page: Page) {
  await page.getByTestId("main-scroll").evaluate((el) => el.scrollTo(0, el.scrollHeight));
}

for (const variant of [
  { name: "live-scale", viewport: { width: 1920, height: 945 }, deviceScaleFactor: 1568 / 1920 },
  { name: "1568", viewport: { width: 1568, height: 772 }, deviceScaleFactor: 1 },
]) {
  test.describe(`replica screenshots (${variant.name})`, () => {
    test.use({ viewport: variant.viewport, deviceScaleFactor: variant.deviceScaleFactor });

    test("my dashboard (data + empty)", async ({ page, context }) => {
      await page.goto(`/dashboard/${USER}/my_dashboard?scenario=default`);
      await expect(page.getByTestId("stat-value").first()).toBeVisible();
      await expect(page.getByTestId("screenshot-card").first()).toBeVisible();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `docs/replica-screens/${variant.name}-my-dashboard.png` });
      await scrollMainToBottom(page);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `docs/replica-screens/${variant.name}-my-dashboard-bottom.png` });

      await page.goto(`/dashboard/${USER}/my_dashboard?scenario=empty`);
      await expect(page.getByText("No recent activity")).toBeVisible();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `docs/replica-screens/${variant.name}-my-dashboard-empty.png` });
      await context.clearCookies();
    });

    test("manager view (top + bottom)", async ({ page }) => {
      await page.goto(`/dashboard/${USER}/manager_view?scenario=default`);
      await expect(page.getByTestId("performance-chart")).toBeVisible();
      await expect(page.getByTestId("top-employees-card").getByRole("row").nth(1)).toBeVisible();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `docs/replica-screens/${variant.name}-manager-view-top.png` });
      await scrollMainToBottom(page);
      await expect(page.getByTestId("daily-limits-card").getByText("View All")).toBeVisible();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `docs/replica-screens/${variant.name}-manager-view-bottom.png` });
    });
  });
}

test.describe("replica screenshots (overlays)", () => {
  test.use({ viewport: { width: 1920, height: 945 }, deviceScaleFactor: 1568 / 1920 });

  test("sheet, viewer, date picker, sidebar menu, loading", async ({ page }) => {
    await page.goto(`/dashboard/${USER}/my_dashboard?latency=4000`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "docs/replica-screens/overlay-loading-skeletons.png" });
    await page.goto(`/dashboard/${USER}/my_dashboard?latency=300`);
    await page.getByTestId("top-apps-view-all").click();
    await expect(page.getByTestId("top-apps-sheet").getByTestId("sheet-row").first()).toBeVisible();
    await page.waitForTimeout(700);
    await page.screenshot({ path: "docs/replica-screens/overlay-top-apps-sheet.png" });
    await page.keyboard.press("Escape");

    await page.getByTestId("date-range-trigger").click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "docs/replica-screens/overlay-date-picker.png" });
    await page.keyboard.press("Escape");

    await page.getByTitle("Activity", { exact: true }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "docs/replica-screens/overlay-sidebar-menu.png" });
    await page.keyboard.press("Escape");

    await page.getByTestId("screenshot-thumb").first().click();
    await expect(page.getByTestId("screenshot-viewer")).toBeVisible();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "docs/replica-screens/overlay-screenshot-viewer.png" });
  });
});

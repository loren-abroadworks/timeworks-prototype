import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against the production build on port 4317 (built + started automatically).
 * Reuses an already running `npm run dev` / `npm start` on the same port.
 */
/** Override with PW_BASE_URL=http://localhost:4318 to test a dev server on another port. */
const BASE_URL = process.env.PW_BASE_URL || "http://localhost:4317";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: BASE_URL,
    // The demo user works in New York; pin the browser zone so "today" means the same day for browser and mock API.
    timezoneId: "America/New_York",
    viewport: { width: 1568, height: 772 },
  },
  // "chromium" = functional E2E specs; "screens" = the screenshot-capture specs (docs/replica-screens).
  projects: [
    { name: "chromium", testIgnore: /screens(-[a-z0-9-]+)?.spec.ts$/ },
    { name: "screens", testMatch: /screens(-[a-z0-9-]+)?.spec.ts$/ },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: `${BASE_URL}/api/v1/user/details?latency=0`,
    reuseExistingServer: true,
    timeout: 300_000,
  },
});

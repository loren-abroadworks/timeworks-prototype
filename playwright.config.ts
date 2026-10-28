import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against the production build on port 4317 (built + started automatically).
 * Reuses an already running `npm run dev` / `npm start` on the same port.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:4317",
    viewport: { width: 1568, height: 772 },
  },
  projects: [{ name: "chromium" }],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:4317/api/v1/user/details?latency=0",
    reuseExistingServer: true,
    timeout: 300_000,
  },
});

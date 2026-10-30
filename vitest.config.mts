import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    env: { MOCK_LATENCY_MS: "0" },
    // Store rebuilds (reset, seed) can take several seconds on a busy machine.
    testTimeout: 30_000,
  },
});

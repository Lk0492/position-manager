import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4179",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "STATIC_ROOT=dist PORT=4179 node deploy/server.mjs",
    url: "http://127.0.0.1:4179",
    reuseExistingServer: false,
  },
});

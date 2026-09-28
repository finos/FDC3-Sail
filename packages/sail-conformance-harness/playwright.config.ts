import { defineConfig, devices } from "@playwright/test"

/**
 * Drives the FDC3 2.2 conformance suite headlessly against the harness.
 *
 * The harness serves the vendored toolbox build (see vite.config.ts `publicDir`),
 * so the conformance app, the 16 mock apps and the app directory all live on
 * http://localhost:3001 — same-origin with the harness, which WCP host-instance
 * adoption requires. See HEADLESS.md for the signalling contract.
 */
/**
 * Escape hatch for images that already ship a Chromium whose build number does not
 * match this Playwright release (CI containers, sandboxes). Unset locally, where
 * Playwright's own download is used.
 */
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE

export default defineConfig({
  testDir: "./e2e",
  // Pin to the headless suite so a leftover Playwright scaffold spec cannot fail the run.
  testMatch: "conformance.spec.ts",
  // A full run is minutes, not seconds: TestTimeout is 20s per conformance test and
  // NoListenerTimeout is 120s. The committed baseline run takes ~6 minutes.
  timeout: 15 * 60_000,
  expect: { timeout: 30_000 },
  // The suite opens real popup windows for the mock apps; parallelism breaks it.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ["list"],
    ["junit", { outputFile: "artifacts/conformance-junit.xml" }],
    ["html", { outputFolder: "artifacts/playwright-report", open: "never" }],
  ],
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1400, height: 1000 },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // `channel` and `executablePath` are mutually exclusive.
        ...(chromiumExecutable
          ? { channel: undefined, launchOptions: { executablePath: chromiumExecutable } }
          : {}),
      },
    },
  ],
  webServer: {
    command: "npm run dev:e2e",
    url: "http://localhost:3001/directories/local-conformance.json",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
})

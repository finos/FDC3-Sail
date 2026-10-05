import { defineConfig, devices } from "@playwright/test"

/**
 * Drives the FDC3 conformance suite against the harness via Playwright:
 * open Conformance1, click Run, scrape `#mocha`.
 *
 * - Local toolbox (`CONFORMANCE_TOOLBOX=local`, default): serves
 *   `@robmoffat/fdc3-conformance-{2.2|3.0}` as Vite `publicDir` (same-origin).
 * - Hosted toolbox (`CONFORMANCE_TOOLBOX=hosted`): harness on :3001, apps from
 *   https://fdc3.finos.org/toolbox/fdc3-conformance (cross-origin).
 *
 * Select version with `CONFORMANCE_FDC3_VERSION=2.2|3.0`.
 */
/**
 * Escape hatch for images that already ship a Chromium whose build number does not
 * match this Playwright release (CI containers, sandboxes). Unset locally, where
 * Playwright's own download is used.
 */
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
const fdc3Version = process.env.CONFORMANCE_FDC3_VERSION === "3.0" ? "3.0" : "2.2"
const toolbox = process.env.CONFORMANCE_TOOLBOX === "hosted" ? "hosted" : "local"
const isHosted = toolbox === "hosted"

const buildAgents =
  "HARNESS_NO_OPEN=1 npm run build -w @finos/sail-headless-agent -w @finos/sail-browser-agent --prefix ../.."
const webServerCommand = isHosted
  ? `${buildAgents} && HARNESS_NO_OPEN=1 vp dev`
  : `${buildAgents} && HARNESS_NO_OPEN=1 vp dev --mode toolbox-local`

export default defineConfig({
  testDir: "./e2e",
  // Pin to the headless suite so a leftover Playwright scaffold spec cannot fail the run.
  testMatch: "conformance.spec.ts",
  // A full run is minutes, not seconds: TestTimeout is 20s per conformance test and
  // NoListenerTimeout is 120s. A full suite run takes ~6 minutes.
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
    command: webServerCommand,
    url: isHosted
      ? "http://localhost:3001/"
      : "http://localhost:3001/directories/localhost-conformance.json",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      CONFORMANCE_FDC3_VERSION: fdc3Version,
      CONFORMANCE_TOOLBOX: toolbox,
    },
  },
})

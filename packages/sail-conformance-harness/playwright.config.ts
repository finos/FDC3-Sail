import { defineConfig, devices } from "@playwright/test"

import {
  CONFORMANCE_HOSTS,
  hostProcessEnv,
  resolveConformanceHostId,
  startHostCommand,
} from "./e2e/hosts"
import {
  resolveConformanceFdc3Version,
  resolveToolboxRoot,
  startToolboxCommand,
  TOOLBOX_DIRECTORY_URL,
} from "./e2e/toolbox"

/**
 * One conformance matrix cell: a product host (`CONFORMANCE_HOST`) running `SailDesktopAgent`,
 * against one FDC3 suite (`CONFORMANCE_FDC3_VERSION`, `CONFORMANCE_TOOLBOX` — see e2e/toolbox.ts).
 *
 * Two web servers: the toolbox on :3001 (Conformance1, the mock apps and their App Directory) and
 * the host. The spec opens Conformance1 in the host, clicks Run and scrapes `#mocha`.
 */

/**
 * Escape hatch for images that already ship a Chromium whose build number does not
 * match this Playwright release (CI containers, sandboxes). Unset locally, where
 * Playwright's own download is used.
 */
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
const fdc3Version = resolveConformanceFdc3Version()
const host = CONFORMANCE_HOSTS[resolveConformanceHostId()]

export default defineConfig({
  testDir: "./e2e",
  // Pin to the conformance spec so a leftover Playwright scaffold spec cannot fail the run.
  testMatch: "conformance.spec.ts",
  // A full run is minutes, not seconds: TestTimeout is 20s per conformance test and
  // NoListenerTimeout is 120s.
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
    baseURL: host.url,
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
  webServer: [
    {
      command: startToolboxCommand(resolveToolboxRoot(fdc3Version)),
      url: TOOLBOX_DIRECTORY_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: startHostCommand(host),
      url: host.url,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...hostProcessEnv(fdc3Version) } as Record<string, string>,
    },
  ],
})

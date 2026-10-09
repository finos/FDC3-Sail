import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test"

import {
  buildHostCommand,
  CONFORMANCE_HOSTS,
  hostProcessEnv,
  LOCAL_CONFORMANCE_DIRECTORY_URL,
  resolveConformanceFdc3Version,
  resolveConformanceHostId,
  startHostCommand,
  startLocalToolboxCommand,
} from "./e2e/hosts"

/**
 * Drives the FDC3 conformance suite against a product Desktop Agent:
 * open Conformance1 via `?appId=`, click Run, scrape `#mocha`.
 *
 * Env:
 * - `CONFORMANCE_HOST` = sail-one | sail-finance | sail-v2-web
 * - `CONFORMANCE_FDC3_VERSION` = 2.2 | 3.0
 *
 * Toolbox: both versions start `@robmoffat/fdc3-conformance` locally on :3001.
 */

const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
const fdc3Version = resolveConformanceFdc3Version()
const hostId = resolveConformanceHostId()
const host = CONFORMANCE_HOSTS[hostId]

const buildCmd = buildHostCommand(host)
const hostCmd = `${buildCmd} && ${startHostCommand(host, fdc3Version)}`

const webServers: NonNullable<PlaywrightTestConfig["webServer"]> = [
  {
    command: startLocalToolboxCommand(fdc3Version),
    url: LOCAL_CONFORMANCE_DIRECTORY_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  {
    command: hostCmd,
    url: host.url,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    // Ensure VITE_* reach the host process (not only via shell prefixes).
    env: {
      ...process.env,
      ...hostProcessEnv(host, fdc3Version),
    },
  },
]

export default defineConfig({
  testDir: "./e2e",
  testMatch: "conformance.spec.ts",
  timeout: 15 * 60_000,
  expect: { timeout: 30_000 },
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
        ...(chromiumExecutable
          ? { channel: undefined, launchOptions: { executablePath: chromiumExecutable } }
          : {}),
      },
    },
  ],
  webServer: webServers,
})

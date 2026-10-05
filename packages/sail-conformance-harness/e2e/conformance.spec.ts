import { expect, test } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  formatFailureReport,
  resolveConformanceFdc3Version,
  summariseResult,
} from "./conformance-result"
import { awaitMochaResult, installMochaEndHook } from "./mocha-scrape"

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const ARTIFACTS = join(PACKAGE_ROOT, "artifacts")
const fdc3Version = resolveConformanceFdc3Version()

test(`FDC3 ${fdc3Version} conformance suite runs via UI and mocha scrape`, async ({ page }) => {
  mkdirSync(ARTIFACTS, { recursive: true })

  await page.goto("/?appId=Conformance1")

  // Conformance1 mounts as an iframe; #testSuite options are filled after getAgent().
  const iframe = page.locator('iframe[src*="/apps/app/index.html"]')
  await iframe.waitFor({ state: "attached", timeout: 60_000 })
  const frame = page.frameLocator('iframe[src*="/apps/app/index.html"]')
  await frame.locator("#testSuite option").first().waitFor({ state: "attached", timeout: 120_000 })
  await frame.locator("#testSuite").selectOption({ label: "All" })

  // Mocha paints `li.test` nodes as each case runs. Without an end hook / suite total,
  // gaps between suites look "finished" and the scrape returns a short prefix (~23 tests).
  const mochaFrame = page.frames().find(f => f.url().includes("/apps/app/index.html"))
  if (!mochaFrame) {
    throw new Error("Conformance iframe not found before Run")
  }
  const hooked = await installMochaEndHook(mochaFrame)
  expect(hooked, "mocha.run end hook installed in conformance iframe").toBe(true)

  await frame.locator("#runButton").click()

  const outcome = await awaitMochaResult(page).catch(async (error: unknown) => {
    await page.screenshot({ path: join(ARTIFACTS, "conformance-timeout.png"), fullPage: true })
    throw error
  })

  writeFileSync(join(ARTIFACTS, "conformance.json"), `${JSON.stringify(outcome, null, 2)}\n`)

  // Grow the iframe so a full-height #mocha screenshot includes every row.
  await page
    .evaluate(() => {
      const iframe = document.querySelector<HTMLIFrameElement>(
        'iframe[src*="/apps/app/index.html"]',
      )
      const height = iframe?.contentDocument?.documentElement.scrollHeight
      if (iframe && height) {
        iframe.style.height = `${height}px`
      }
      return height ?? 0
    })
    .catch(() => 0)

  await frame
    .locator("#mocha")
    .screenshot({ path: join(ARTIFACTS, "conformance.png") })
    .catch(() => {
      // Best-effort: a broken mocha tree means the list never rendered.
    })

  expect(outcome.status, outcome.error ?? "run did not complete").toBe("complete")

  console.log(`FDC3 ${fdc3Version}: ${summariseResult(outcome)}`)

  expect(outcome.failures ?? 0, formatFailureReport(outcome)).toBe(0)
  expect(formatFailureReport(outcome)).toBe("")
})

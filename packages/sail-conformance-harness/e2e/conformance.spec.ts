import { expect, test } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  formatFailureReport,
  resolveConformanceFdc3Version,
  summariseResult,
} from "./conformance-result"
import { resolveConformanceHostId } from "./hosts"
import { awaitMochaResult, installMochaEndHook } from "./mocha-scrape"

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const ARTIFACTS = join(PACKAGE_ROOT, "artifacts")
const fdc3Version = resolveConformanceFdc3Version()
const hostId = resolveConformanceHostId()

/**
 * Conformance1 iframe selectors differ slightly by host URL rewriting, but the
 * toolbox always serves the suite under `/apps/app/index.html`.
 */
const CONFORMANCE_IFRAME = 'iframe[src*="/apps/app/index.html"]'

test(`FDC3 ${fdc3Version} conformance on ${hostId}`, async ({ page }) => {
  mkdirSync(ARTIFACTS, { recursive: true })

  await page.goto("/?appId=Conformance1")

  const iframe = page.locator(CONFORMANCE_IFRAME)
  await iframe.waitFor({ state: "attached", timeout: 120_000 })
  const frame = page.frameLocator(CONFORMANCE_IFRAME)
  await frame.locator("#testSuite option").first().waitFor({ state: "attached", timeout: 120_000 })
  await frame.locator("#testSuite").selectOption({ label: "All" })

  const mochaFrame = page.frames().find(f => f.url().includes("/apps/app/index.html"))
  if (!mochaFrame) {
    throw new Error("Conformance iframe not found before Run")
  }
  const hooked = await installMochaEndHook(mochaFrame)
  expect(hooked, "mocha.run end hook installed in conformance iframe").toBe(true)

  await frame.locator("#runButton").click()

  const outcome = await awaitMochaResult(page).catch(async (error: unknown) => {
    await page.screenshot({
      path: join(ARTIFACTS, `conformance-timeout-${hostId}-${fdc3Version}.png`),
      fullPage: true,
    })
    throw error
  })

  writeFileSync(
    join(ARTIFACTS, `conformance-${hostId}-${fdc3Version}.json`),
    `${JSON.stringify({ host: hostId, fdc3Version, ...outcome }, null, 2)}\n`,
  )

  await page
    .evaluate(selector => {
      const el = document.querySelector<HTMLIFrameElement>(selector)
      const height = el?.contentDocument?.documentElement.scrollHeight
      if (el && height) {
        el.style.height = `${height}px`
      }
      return height ?? 0
    }, CONFORMANCE_IFRAME)
    .catch(() => 0)

  await frame
    .locator("#mocha")
    .screenshot({ path: join(ARTIFACTS, `conformance-${hostId}-${fdc3Version}.png`) })
    .catch(() => {
      // Best-effort: a broken mocha tree means the list never rendered.
    })

  expect(outcome.status, outcome.error ?? "run did not complete").toBe("complete")

  console.log(`${hostId} FDC3 ${fdc3Version}: ${summariseResult(outcome)}`)

  expect(outcome.failures ?? 0, formatFailureReport(outcome)).toBe(0)
  expect(formatFailureReport(outcome)).toBe("")
})

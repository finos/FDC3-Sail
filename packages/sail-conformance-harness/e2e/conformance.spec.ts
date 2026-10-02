import { expect, test } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  compareToBaseline,
  formatRegressionReport,
  loadBaseline,
  summariseResult,
} from "./conformance-baseline"
import { awaitMochaResult } from "./mocha-scrape"

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const ARTIFACTS = join(PACKAGE_ROOT, "artifacts")

test("FDC3 2.2 conformance suite runs via UI and mocha scrape", async ({ page }) => {
  mkdirSync(ARTIFACTS, { recursive: true })

  await page.goto("/?appId=Conformance1")

  // Conformance1 mounts as an iframe; #testSuite options are filled after getAgent().
  const iframe = page.locator('iframe[src*="/apps/app/index.html"]')
  await iframe.waitFor({ state: "attached", timeout: 60_000 })
  const frame = page.frameLocator('iframe[src*="/apps/app/index.html"]')
  await frame.locator("#testSuite option").first().waitFor({ state: "attached", timeout: 120_000 })
  await frame.locator("#testSuite").selectOption({ label: "All" })
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

  console.log(summariseResult(outcome))

  const baseline = loadBaseline()
  if (!baseline) {
    console.log(
      "No committed baseline found — writing artifacts/conformance.json only. " +
        "Copy it to e2e/conformance-baseline-2.2.json to start gating on regressions.",
    )
    return
  }

  const diff = compareToBaseline(outcome, baseline)
  writeFileSync(join(ARTIFACTS, "conformance-diff.json"), `${JSON.stringify(diff, null, 2)}\n`)

  if (diff.fixed.length > 0) {
    console.log(
      `${diff.fixed.length} test(s) now passing that the baseline expects to fail:\n  ${diff.fixed.join("\n  ")}\n` +
        "Refresh e2e/conformance-baseline-2.2.json to lock the improvement in.",
    )
  }

  expect(formatRegressionReport(diff)).toBe("")
})

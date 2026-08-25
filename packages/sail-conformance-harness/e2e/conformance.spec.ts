import { expect, test, type Page } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  compareToBaseline,
  formatRegressionReport,
  loadBaseline,
  summariseResult,
  type ConformanceResult,
} from "./conformance-baseline"

/** Prefix of the single-line console message carrying the final result. */
const RESULT_SENTINEL = "FDC3_CONFORMANCE_RESULT"
/** Prefix of the per-test console progress messages. */
const STATUS_SENTINEL = "FDC3_CONFORMANCE_STATUS"

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const ARTIFACTS = join(PACKAGE_ROOT, "artifacts")

/**
 * Resolves with the conformance result as soon as any page in the context prints
 * the sentinel.
 *
 * The conformance app runs in an iframe on the harness page, so `page.on('console')`
 * covers it — but the mock apps are launched as popups (`forceNewWindow`), which are
 * separate pages, hence the `context.on('page')` subscription too.
 */
function awaitResult(page: Page): Promise<ConformanceResult> {
  return new Promise(resolve => {
    let lastProgress = ""

    const onConsole = (msg: { text(): string }) => {
      const text = msg.text()
      if (text.startsWith(RESULT_SENTINEL)) {
        resolve(JSON.parse(text.slice(RESULT_SENTINEL.length + 1)) as ConformanceResult)
        return
      }
      if (text.startsWith(STATUS_SENTINEL)) {
        const { completed, total } = JSON.parse(text.slice(STATUS_SENTINEL.length + 1)) as {
          completed: number
          total: number
        }
        const progress = `${completed}/${total}`
        // One line per change, not per event — this ends up in CI logs.
        if (progress !== lastProgress) {
          lastProgress = progress
          console.log(`  conformance ${progress}`)
        }
      }
    }

    page.on("console", onConsole)
    page.context().on("page", opened => opened.on("console", onConsole))
  })
}

test("FDC3 2.2 conformance suite runs headlessly", async ({ page }) => {
  mkdirSync(ARTIFACTS, { recursive: true })

  // Subscribe before navigating so no sentinel is missed.
  const resultPromise = awaitResult(page)

  await page.goto("/?appId=Conformance1Headless")

  const outcome = await resultPromise.catch(async (error: unknown) => {
    await page.screenshot({ path: join(ARTIFACTS, "conformance-timeout.png"), fullPage: true })
    throw error
  })

  writeFileSync(join(ARTIFACTS, "conformance.json"), `${JSON.stringify(outcome, null, 2)}\n`)

  // #mocha is a long scrolling list inside a fixed-height iframe. Screenshotting the element
  // alone yields an image the full height of the list but with only the slice that fits the
  // iframe's viewport actually painted — the rest comes out blank. Grow the iframe to its
  // content height first so every row renders. Same-origin, because the toolbox is served from
  // the harness origin (see `publicDir` in vite.config.ts).
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

  const frame = page.frameLocator('iframe[src*="/apps/app/index.html"]')
  await frame
    .locator("#mocha")
    .screenshot({ path: join(ARTIFACTS, "conformance.png") })
    .catch(() => {
      // Best-effort: an `error` result means the list never rendered.
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

  // Gate on regressions against the committed baseline rather than on zero failures:
  // the suite has known failures, so an absolute gate would be red from day one.
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

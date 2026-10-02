import type { Frame, Page } from "@playwright/test"

import type {
  ConformanceResult,
  ConformanceTestResult,
  ConformanceTestState,
} from "./conformance-baseline"

export type MochaSnapshot = {
  passes: number
  failures: number
  pending: number
  durationMs: number
  tests: ConformanceTestResult[]
  /** True when Mocha has painted stats and every listed test has a terminal state. */
  finished: boolean
}

/**
 * Read Mocha's HTML reporter from the conformance iframe `#mocha` root.
 *
 * Mocha marks completed tests with `.pass` / `.fail` / `.pending`. While a run is
 * in progress, some `li.test` nodes may lack those classes; `finished` is false
 * until every test has a terminal class and `#mocha-stats` is present.
 */
export async function scrapeMocha(frame: Frame): Promise<MochaSnapshot | null> {
  return frame.evaluate(() => {
    const root = document.querySelector("#mocha")
    if (!root) {
      return null
    }

    const stats = document.querySelector("#mocha-stats")
    const passesText = stats?.querySelector(".passes em")?.textContent ?? "0"
    const failuresText = stats?.querySelector(".failures em")?.textContent ?? "0"
    const durationText = stats?.querySelector(".duration em")?.textContent ?? "0"

    const tests: ConformanceTestResult[] = []
    let unfinished = 0

    const testNodes = Array.from(root.querySelectorAll("li.test"))
    for (const testEl of testNodes) {
      const titleEl = testEl.querySelector("h2")
      if (!titleEl) {
        continue
      }

      // Mocha puts duration in an <span> inside h2; strip it for a stable title.
      const title = Array.from(titleEl.childNodes)
        .filter((node): node is Text => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent ?? "")
        .join("")
        .replace(/\s+/g, " ")
        .trim()

      let state: ConformanceTestState | undefined
      if (testEl.classList.contains("pass")) {
        state = "passed"
      } else if (testEl.classList.contains("fail")) {
        state = "failed"
      } else if (testEl.classList.contains("pending")) {
        state = "pending"
      } else {
        unfinished += 1
        continue
      }

      const suiteTitles: string[] = []
      let suiteEl: Element | null = testEl.parentElement
      while (suiteEl) {
        if (suiteEl.matches("li.suite")) {
          const suiteTitle = suiteEl.querySelector(":scope > h1")?.textContent?.trim()
          if (suiteTitle) {
            suiteTitles.unshift(suiteTitle)
          }
        }
        suiteEl = suiteEl.parentElement
      }

      const error =
        state === "failed"
          ? (testEl.querySelector("pre.error")?.textContent?.trim() ?? undefined)
          : undefined

      const durationMatch = titleEl.querySelector("span")?.textContent?.match(/([\d.]+)\s*ms/)
      const durationMs = durationMatch ? Number(durationMatch[1]) : undefined

      tests.push({
        title,
        suite: suiteTitles.join(" / "),
        state,
        ...(durationMs !== undefined && !Number.isNaN(durationMs) ? { durationMs } : {}),
        ...(error ? { error } : {}),
      })
    }

    const passes = Number(passesText) || tests.filter(t => t.state === "passed").length
    const failures = Number(failuresText) || tests.filter(t => t.state === "failed").length
    const pending = tests.filter(t => t.state === "pending").length
    // Mocha duration is often like "12.3s" — parse loosely.
    let durationMs = 0
    const durationMatch = durationText.match(/([\d.]+)\s*(ms|s)?/i)
    if (durationMatch) {
      const value = Number(durationMatch[1])
      const unit = (durationMatch[2] ?? "ms").toLowerCase()
      durationMs = unit === "s" ? value * 1000 : value
    }

    return {
      passes,
      failures,
      pending,
      durationMs,
      tests,
      finished: Boolean(stats) && unfinished === 0 && tests.length > 0,
    }
  })
}

/**
 * Poll `#mocha` until Mocha finishes (stable finished snapshot) or timeout.
 */
export async function awaitMochaResult(
  page: Page,
  options?: { pollMs?: number; timeoutMs?: number },
): Promise<ConformanceResult> {
  const pollMs = options?.pollMs ?? 1500
  const timeoutMs = options?.timeoutMs ?? 14 * 60 * 1000
  const started = Date.now()
  let lastProgress = ""
  let stableFinishedCount = 0
  let lastFingerprint = ""

  const frameLocator = page.frameLocator('iframe[src*="/apps/app/index.html"]')
  // Ensure the iframe exists before we start scraping.
  await frameLocator.locator("#mocha").waitFor({ state: "attached", timeout: 60_000 })

  const frame = page.frames().find(f => f.url().includes("/apps/app/index.html"))
  if (!frame) {
    throw new Error("Conformance iframe not found")
  }

  while (Date.now() - started < timeoutMs) {
    // Re-resolve in case navigation replaced the frame.
    const current =
      page.frames().find(f => f.url().includes("/apps/app/index.html")) ?? frame
    const snap = await scrapeMocha(current)
    if (snap) {
      const completed = snap.passes + snap.failures + snap.pending
      const progress = `${completed} (pass=${snap.passes} fail=${snap.failures} pending=${snap.pending})`
      if (progress !== lastProgress) {
        lastProgress = progress
        console.log(`  conformance ${progress}`)
      }

      if (snap.finished) {
        const fingerprint = `${snap.passes}:${snap.failures}:${snap.pending}:${snap.tests.length}`
        if (fingerprint === lastFingerprint) {
          stableFinishedCount += 1
        } else {
          lastFingerprint = fingerprint
          stableFinishedCount = 1
        }

        // Require two consecutive identical finished scrapes so late flushes settle.
        if (stableFinishedCount >= 2) {
          return {
            status: "complete",
            suite: "All",
            passes: snap.passes,
            failures: snap.failures,
            pending: snap.pending,
            total: snap.tests.length,
            durationMs: snap.durationMs,
            tests: snap.tests,
          }
        }
      } else {
        stableFinishedCount = 0
        lastFingerprint = ""
      }
    }

    await page.waitForTimeout(pollMs)
  }

  throw new Error(`Conformance mocha scrape timed out after ${timeoutMs}ms`)
}

import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

export type ConformanceTestState = "passed" | "failed" | "pending"

export type ConformanceTestResult = {
  title: string
  suite: string
  state: ConformanceTestState
  durationMs?: number
  error?: string
}

export type ConformanceResult = {
  status: "complete" | "error" | "running"
  suite: string
  passes?: number
  failures?: number
  pending?: number
  total?: number
  durationMs?: number
  error?: string
  tests?: ConformanceTestResult[]
}

/** Committed expectation: the set of test titles known to fail. */
export type ConformanceBaseline = {
  /** Free-text note on when and against what this was captured. */
  note?: string
  failing: string[]
}

export const BASELINE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "conformance-baseline-2.2.json",
)

export function loadBaseline(): ConformanceBaseline | undefined {
  if (!existsSync(BASELINE_PATH)) {
    return undefined
  }
  return JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as ConformanceBaseline
}

export type BaselineDiff = {
  /** Failing now, passing (or absent) in the baseline — these fail the build. */
  regressions: ConformanceTestResult[]
  /** Passing now, expected to fail — the baseline is stale in a good way. */
  fixed: string[]
  /** In the baseline but not in this run at all — usually a renamed or dropped test. */
  missing: string[]
}

export function compareToBaseline(
  result: ConformanceResult,
  baseline: ConformanceBaseline,
): BaselineDiff {
  const tests = result.tests ?? []
  const expectedFailing = new Set(baseline.failing)
  const seen = new Set(tests.map(test => test.title))

  return {
    regressions: tests.filter(test => test.state === "failed" && !expectedFailing.has(test.title)),
    fixed: tests
      .filter(test => test.state === "passed" && expectedFailing.has(test.title))
      .map(test => test.title),
    missing: baseline.failing.filter(title => !seen.has(title)),
  }
}

/** Empty string when there is nothing to report, so it reads well in an assertion. */
export function formatRegressionReport(diff: BaselineDiff): string {
  if (diff.regressions.length === 0) {
    return ""
  }
  return diff.regressions
    .map(test => `${test.title}: ${test.error ?? "failed with no error message"}`)
    .join("\n")
}

export function summariseResult(result: ConformanceResult): string {
  const seconds = result.durationMs ? (result.durationMs / 1000).toFixed(1) : "?"
  return `conformance ${result.suite}: ${result.passes ?? 0} passed, ${result.failures ?? 0} failed, ${result.pending ?? 0} pending of ${result.total ?? 0} in ${seconds}s`
}

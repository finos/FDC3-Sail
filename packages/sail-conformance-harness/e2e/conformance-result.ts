import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { ConformanceFdc3Version } from "./toolbox"

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

/**
 * Committed list of the tests a run must contain, as {@link testKey}s. A run that loads fewer, or
 * drops one, fails — so a silently broken suite can't pass (sail-plans #49).
 */
export type ExpectedTests = {
  note?: string
  tests: string[]
}

/** Mocha titles repeat across suites, so a test is named by suite and title together. */
export function testKey(test: Pick<ConformanceTestResult, "suite" | "title">): string {
  return `${test.suite} / ${test.title}`
}

export function expectedTestsPath(version: ConformanceFdc3Version): string {
  return join(dirname(fileURLToPath(import.meta.url)), `expected-tests-${version}.json`)
}

export function loadExpectedTests(version: ConformanceFdc3Version): ExpectedTests | undefined {
  const path = expectedTestsPath(version)
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as ExpectedTests) : undefined
}

/** Everything wrong with a run, one line each. Empty when the run is clean. */
export function checkRun(result: ConformanceResult, expected: ExpectedTests | undefined): string[] {
  if (result.status !== "complete") {
    return [`Run did not complete: ${result.error ?? result.status}`]
  }

  const tests = result.tests ?? []
  const problems = tests
    .filter(test => test.state === "failed")
    .map(test => `Failed: ${testKey(test)}: ${test.error ?? "no error message"}`)

  if (!expected) {
    problems.push(
      "No expected-tests file for this FDC3 version. Write e2e/expected-tests-<version>.json " +
        "from a clean run's artifacts/conformance-*.json.",
    )
    return problems
  }

  if (tests.length < expected.tests.length) {
    problems.push(`Only ${tests.length} of ${expected.tests.length} expected tests ran`)
  }
  const ran = new Set(tests.map(testKey))
  for (const key of expected.tests) {
    if (!ran.has(key)) {
      problems.push(`Missing: ${key}`)
    }
  }
  return problems
}

export function summariseResult(result: ConformanceResult): string {
  const seconds = result.durationMs ? (result.durationMs / 1000).toFixed(1) : "?"
  return `${result.passes ?? 0} passed, ${result.failures ?? 0} failed, ${result.pending ?? 0} pending of ${result.total ?? 0} in ${seconds}s`
}

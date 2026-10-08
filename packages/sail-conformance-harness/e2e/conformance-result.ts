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

export type { ConformanceFdc3Version } from "./hosts"
export { resolveConformanceFdc3Version } from "./hosts"

export function summariseResult(result: ConformanceResult): string {
  const seconds = result.durationMs ? (result.durationMs / 1000).toFixed(1) : "?"
  return `conformance ${result.suite}: ${result.passes ?? 0} passed, ${result.failures ?? 0} failed, ${result.pending ?? 0} pending of ${result.total ?? 0} in ${seconds}s`
}

/** Empty string when clean — used in Playwright assertions. */
export function formatFailureReport(result: ConformanceResult): string {
  const failed = (result.tests ?? []).filter(test => test.state === "failed")
  if (failed.length === 0) {
    return ""
  }
  return failed
    .map(test => `${test.title}: ${test.error ?? "failed with no error message"}`)
    .join("\n")
}

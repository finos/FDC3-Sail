import { describe, expect, it } from "vite-plus/test"
import {
  checkRun,
  summariseResult,
  testKey,
  type ConformanceResult,
  type ConformanceTestResult,
} from "./conformance-result"

function passed(title: string, suite = "Suite"): ConformanceTestResult {
  return { title, suite, state: "passed" }
}

function run(tests: ConformanceTestResult[]): ConformanceResult {
  return {
    status: "complete",
    suite: "All",
    passes: tests.filter(test => test.state === "passed").length,
    failures: tests.filter(test => test.state === "failed").length,
    pending: tests.filter(test => test.state === "pending").length,
    total: tests.length,
    tests,
  }
}

const expected = { tests: [testKey(passed("a")), testKey(passed("b"))] }

describe("checkRun", () => {
  it("passes a complete run of every expected test", () => {
    expect(checkRun(run([passed("a"), passed("b")]), expected)).toEqual([])
  })

  it("fails when fewer tests ran than expected", () => {
    const problems = checkRun(run([passed("a")]), expected)

    expect(problems.join("\n")).toMatch(/1 of 2 expected tests ran/)
  })

  it("names an expected test that is missing, even when the count still matches", () => {
    const problems = checkRun(run([passed("a"), passed("c")]), expected)

    expect(problems.join("\n")).toContain("Suite / b")
  })

  it("fails on a failing test and shows its error", () => {
    const failing: ConformanceTestResult = {
      title: "b",
      suite: "Suite",
      state: "failed",
      error: "boom",
    }

    expect(checkRun(run([passed("a"), failing]), expected).join("\n")).toContain("boom")
  })

  it("fails a run that did not complete", () => {
    const problems = checkRun({ ...run([]), status: "error", error: "no iframe" }, expected)

    expect(problems.join("\n")).toContain("no iframe")
  })

  it("fails when there is no expected list to check against", () => {
    expect(checkRun(run([passed("a")]), undefined).join("\n")).toMatch(/expected-tests/)
  })
})

describe("summariseResult", () => {
  it("reports pass, fail and total counts", () => {
    expect(summariseResult(run([passed("a"), passed("b")]))).toMatch(/2 passed, 0 failed.*of 2/)
  })
})

import { describe, expect, it } from "vite-plus/test"

import { isFdc3VersionAtLeast, parseFdc3Version } from "../fdc3-version"

describe("fdc3-version", () => {
  it("parses major.minor versions", () => {
    expect(parseFdc3Version("2.2")).toEqual({ major: 2, minor: 2 })
    expect(parseFdc3Version("3.0")).toEqual({ major: 3, minor: 0 })
  })

  it("compares versions for runtime support contracts", () => {
    expect(isFdc3VersionAtLeast("3.0", "3.0")).toBe(true)
    expect(isFdc3VersionAtLeast("3.1", "3.0")).toBe(true)
    expect(isFdc3VersionAtLeast("2.2", "3.0")).toBe(false)
    expect(isFdc3VersionAtLeast("2.2", "2.2")).toBe(true)
  })
})

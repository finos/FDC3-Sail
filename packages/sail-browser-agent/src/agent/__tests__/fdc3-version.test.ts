import { describe, expect, it } from "vite-plus/test"
import { isFdc3VersionAtLeast, negotiateFdc3Version, toFdc3ApiVersion } from "../fdc3-version"

describe("negotiateFdc3Version", () => {
  it("selects 3.0 when the client requests 3.x and the DA max is 3.0", () => {
    expect(negotiateFdc3Version("3.0", "3.0")).toBe("3.0")
    expect(negotiateFdc3Version("3.0.0-alpha.5", "3.0")).toBe("3.0")
  })

  it("selects 2.2 when the client requests 2.x even if the DA max is 3.0", () => {
    expect(negotiateFdc3Version("2.2", "3.0")).toBe("2.2")
  })

  it("rejects missing or unsupported client versions", () => {
    expect(negotiateFdc3Version(undefined, "3.0")).toBeNull()
    expect(negotiateFdc3Version("1.2", "3.0")).toBeNull()
    expect(negotiateFdc3Version("4.0", "3.0")).toBeNull()
    expect(negotiateFdc3Version("not-a-version", "3.0")).toBeNull()
  })

  it("rejects 3.x when the DA max is 2.2", () => {
    expect(negotiateFdc3Version("3.0", "2.2")).toBeNull()
    expect(negotiateFdc3Version("2.2", "2.2")).toBe("2.2")
  })
})

describe("toFdc3ApiVersion", () => {
  it("maps metadata strings onto handler keys", () => {
    expect(toFdc3ApiVersion("3.0")).toBe("3.0")
    expect(toFdc3ApiVersion("2.2")).toBe("2.2")
    expect(isFdc3VersionAtLeast("3.0", "3.0")).toBe(true)
  })
})

import { describe, expect, it } from "vite-plus/test"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { resolveConformanceFdc3Version, resolveToolboxRoot, TOOLBOX_DIRECTORY_URL } from "./toolbox"

describe("resolveConformanceFdc3Version", () => {
  it("defaults to 2.2", () => {
    expect(resolveConformanceFdc3Version(undefined)).toBe("2.2")
  })

  it("accepts 3.0", () => {
    expect(resolveConformanceFdc3Version("3.0")).toBe("3.0")
  })

  it("rejects an unknown version instead of guessing", () => {
    expect(() => resolveConformanceFdc3Version("2.1")).toThrow(/CONFORMANCE_FDC3_VERSION/)
  })
})

describe("resolveToolboxRoot", () => {
  it.each(["2.2", "3.0"] as const)(
    "uses the published %s package by default, with a built site in dist/",
    version => {
      const root = resolveToolboxRoot(version, undefined)

      expect(root).toContain(`fdc3-conformance-${version}`)
      expect(existsSync(join(root, "dist", "directories", "localhost-conformance.json"))).toBe(true)
    },
  )

  it("treats 'published' the same as unset", () => {
    expect(resolveToolboxRoot("2.2", "published")).toBe(resolveToolboxRoot("2.2", undefined))
  })

  it("uses a local checkout path as given", () => {
    const checkout = resolveToolboxRoot("3.0", undefined)

    expect(resolveToolboxRoot("2.2", checkout)).toBe(checkout)
  })

  it("rejects a path with no built site", () => {
    expect(() => resolveToolboxRoot("2.2", "/no/such/checkout")).toThrow(/dist/)
  })
})

it("serves the App Directory from the toolbox port", () => {
  expect(TOOLBOX_DIRECTORY_URL).toBe("http://localhost:3001/directories/localhost-conformance.json")
})

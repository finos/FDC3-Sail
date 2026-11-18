import { describe, expect, it } from "vite-plus/test"
import {
  isAutoResolve,
  resolveBootFdc3DirectoryUrl,
  resolveDeepLinkAppId,
  resolveFdc3Directory,
  resolveNoSplash,
} from "./index.js"

describe("sail-env query helpers", () => {
  it("resolves appId", () => {
    expect(resolveDeepLinkAppId("?appId=Conformance1")).toBe("Conformance1")
    expect(resolveDeepLinkAppId("?")).toBeUndefined()
  })

  it("resolves noSplash", () => {
    expect(resolveNoSplash("?noSplash=1")).toBe(true)
    expect(resolveNoSplash("?noSplash=true")).toBe(true)
    expect(resolveNoSplash("?noSplash=0")).toBe(false)
  })

  it("resolveFdc3Directory prefers query over Vite env", () => {
    expect(
      resolveFdc3Directory({
        search: "?fdc3Directory=https://query.example/a.json",
        viteDirectoryUrl: "https://env.example/b.json",
      }),
    ).toBe("https://query.example/a.json")
    expect(
      resolveFdc3Directory({
        search: "?",
        viteDirectoryUrl: "https://env.example/b.json",
      }),
    ).toBe("https://env.example/b.json")
    expect(resolveFdc3Directory({ search: "?" })).toBeUndefined()
    expect(resolveFdc3Directory({ viteDirectoryUrl: "" })).toBeUndefined()
    expect(
      resolveFdc3Directory({
        search: "?conformanceDirectory=https://x",
      }),
    ).toBeUndefined()
  })

  it("isAutoResolve", () => {
    expect(isAutoResolve("1")).toBe(true)
    expect(isAutoResolve("0")).toBe(false)
  })

  it("resolveBootFdc3DirectoryUrl reads process.env when set", () => {
    const previous = process.env.VITE_FDC3_DIRECTORY_URL
    process.env.VITE_FDC3_DIRECTORY_URL = "https://env.example/boot.json"
    try {
      // No location.search in the test worker — falls through to process.env.
      expect(resolveBootFdc3DirectoryUrl()).toBe("https://env.example/boot.json")
    } finally {
      if (previous === undefined) {
        delete process.env.VITE_FDC3_DIRECTORY_URL
      } else {
        process.env.VITE_FDC3_DIRECTORY_URL = previous
      }
    }
  })
})

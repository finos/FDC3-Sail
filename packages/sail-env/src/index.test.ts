import { describe, expect, it } from "vite-plus/test"
import {
  isAutoResolve,
  resolveDeepLinkAppId,
  resolveFdc3Directory,
  resolveNoSplash,
  resolveSoleFdc3Directory,
} from "./index.js"

describe("sail-env query helpers", () => {
  it("resolves appId", () => {
    expect(resolveDeepLinkAppId("?appId=Conformance1")).toBe("Conformance1")
    expect(resolveDeepLinkAppId("?")).toBeUndefined()
  })

  it("resolves fdc3Directory", () => {
    expect(resolveFdc3Directory("?fdc3Directory=https://example.com/apps.json")).toBe(
      "https://example.com/apps.json",
    )
    expect(resolveFdc3Directory("?conformanceDirectory=https://x")).toBeUndefined()
  })

  it("resolves noSplash", () => {
    expect(resolveNoSplash("?noSplash=1")).toBe(true)
    expect(resolveNoSplash("?noSplash=true")).toBe(true)
    expect(resolveNoSplash("?noSplash=0")).toBe(false)
  })

  it("prefers query directory over Vite env", () => {
    expect(
      resolveSoleFdc3Directory({
        search: "?fdc3Directory=https://query.example/a.json",
        viteDirectoryUrl: "https://env.example/b.json",
      }),
    ).toBe("https://query.example/a.json")
    expect(
      resolveSoleFdc3Directory({
        search: "?",
        viteDirectoryUrl: "https://env.example/b.json",
      }),
    ).toBe("https://env.example/b.json")
  })

  it("isAutoResolve", () => {
    expect(isAutoResolve("1")).toBe(true)
    expect(isAutoResolve("0")).toBe(false)
  })
})

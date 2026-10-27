import { describe, expect, it, vi } from "vite-plus/test"
import { readExtensionUrls } from "./read-extension-urls"

const DEFAULTS = ["http://localhost:9100/src/index.ts"]

describe("readExtensionUrls", () => {
  it("returns the defaults when the value is unset", () => {
    expect(readExtensionUrls(undefined, DEFAULTS)).toEqual(DEFAULTS)
  })

  it("returns the defaults when the value has no entries (empty, whitespace or only commas)", () => {
    expect(readExtensionUrls("", DEFAULTS)).toEqual(DEFAULTS)
    expect(readExtensionUrls("   ", DEFAULTS)).toEqual(DEFAULTS)
    expect(readExtensionUrls(" , ,", DEFAULTS)).toEqual(DEFAULTS)
  })

  it("replaces the defaults with a single URL", () => {
    expect(readExtensionUrls("http://localhost:3000/sail-extension/index.js", DEFAULTS)).toEqual([
      "http://localhost:3000/sail-extension/index.js",
    ])
  })

  it("splits several URLs and trims the spaces around them", () => {
    expect(
      readExtensionUrls(
        " http://localhost:9100/src/index.ts , https://engine.example.com/sail-extension/index.js ",
        DEFAULTS,
      ),
    ).toEqual([
      "http://localhost:9100/src/index.ts",
      "https://engine.example.com/sail-extension/index.js",
    ])
  })

  it("skips and warns on entries that are not http(s) URLs", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    expect(
      readExtensionUrls("not a url,ftp://x.example.com/a.js,https://ok.example.com/a.js", DEFAULTS),
    ).toEqual(["https://ok.example.com/a.js"])
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  it("loads nothing (not the defaults) when something was set but every entry is invalid", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    expect(readExtensionUrls("nope, ftp://x.example.com/a.js", DEFAULTS)).toEqual([])
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })
})

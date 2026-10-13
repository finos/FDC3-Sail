import { describe, expect, it } from "vite-plus/test"
import { CONFORMANCE_HOSTS, hostProcessEnv, resolveConformanceHostId } from "./hosts"
import { TOOLBOX_DIRECTORY_URL } from "./toolbox"

describe("resolveConformanceHostId", () => {
  it("defaults to sail-finance", () => {
    expect(resolveConformanceHostId(undefined)).toBe("sail-finance")
  })

  it.each(["sail-one", "sail-finance"])("accepts %s", host => {
    expect(resolveConformanceHostId(host)).toBe(host)
  })

  it("rejects a dropped host instead of falling back", () => {
    expect(() => resolveConformanceHostId("sail-v2-web")).toThrow(/CONFORMANCE_HOST/)
  })
})

it("runs every host against only the toolbox App Directory, with auto-resolve", () => {
  expect(Object.keys(CONFORMANCE_HOSTS).sort()).toEqual(["sail-finance", "sail-one"])
  expect(hostProcessEnv("2.2")).toMatchObject({
    VITE_FDC3_DIRECTORY_URL: TOOLBOX_DIRECTORY_URL,
    VITE_AUTO_RESOLVE: "1",
  })
})

import { describe, expect, it } from "vite-plus/test"
import {
  EXAMPLE_APPS_DIRECTORY_URL,
  FINOS_APP_DIRECTORY_URL,
  readSailHostParams,
} from "../host-params"

describe("readSailHostParams", () => {
  it("loads the FINOS and example-app directories by default", () => {
    expect(readSailHostParams({ search: "", dev: true })).toEqual({
      appDirectories: [FINOS_APP_DIRECTORY_URL, EXAMPLE_APPS_DIRECTORY_URL],
      autoResolve: false,
    })
  })

  it("leaves the localhost example apps out of a production build", () => {
    expect(readSailHostParams({ search: "" }).appDirectories).toEqual([FINOS_APP_DIRECTORY_URL])
  })

  it("reads the deep-linked app id", () => {
    expect(readSailHostParams({ search: "?appId=Conformance1" }).deepLinkAppId).toBe("Conformance1")
  })

  it("uses only the Vite env directory when one is set", () => {
    const params = readSailHostParams({
      search: "",
      viteDirectoryUrl: "http://localhost:3001/d.json",
    })

    expect(params.appDirectories).toEqual(["http://localhost:3001/d.json"])
    expect(params.soleDirectory).toBe("http://localhost:3001/d.json")
  })

  it("lets ?fdc3Directory= win over the Vite env directory when allowed", () => {
    const params = readSailHostParams({
      search: "?fdc3Directory=http%3A%2F%2Fq%2Fd.json",
      viteDirectoryUrl: "http://env/d.json",
      dev: true,
    })

    expect(params.appDirectories).toEqual(["http://q/d.json"])
  })

  it("ignores ?fdc3Directory= unless allowed, so a link can't swap a build's directories", () => {
    const params = readSailHostParams({ search: "?fdc3Directory=http%3A%2F%2Fevil%2Fd.json" })

    expect(params.appDirectories).toEqual([FINOS_APP_DIRECTORY_URL])
  })

  it("turns on auto-resolve only for '1'", () => {
    expect(readSailHostParams({ search: "", viteAutoResolve: "1" }).autoResolve).toBe(true)
    expect(readSailHostParams({ search: "", viteAutoResolve: "true" }).autoResolve).toBe(false)
  })
})

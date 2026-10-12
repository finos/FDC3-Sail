import { afterEach, describe, expect, it, vi } from "vite-plus/test"
import { fetchAppDirectory } from "../fetch-app-directory"

const APP = { appId: "a", title: "A", type: "web", details: { url: "https://a.example" } }

function stubFetch() {
  const fetchMock = vi.fn((_url: string) =>
    Promise.resolve(new Response(JSON.stringify({ applications: [APP] }))),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

describe("fetchAppDirectory", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("adds /v2/apps to a directory base URL", async () => {
    const fetchMock = stubFetch()

    await fetchAppDirectory("https://directory.example")

    expect(fetchMock).toHaveBeenCalledWith("https://directory.example/v2/apps")
  })

  it("keeps a /v2/apps URL as it is", async () => {
    const fetchMock = stubFetch()

    await fetchAppDirectory("https://directory.example/v2/apps")

    expect(fetchMock).toHaveBeenCalledWith("https://directory.example/v2/apps")
  })

  it("fetches a static .json directory file as it is", async () => {
    const fetchMock = stubFetch()

    const apps = await fetchAppDirectory(
      "http://localhost:3001/directories/localhost-conformance.json",
    )

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/directories/localhost-conformance.json",
    )
    expect(apps).toEqual([APP])
  })

  it("accepts an app with a name but no title (AppD 2.0 requires name, not title)", async () => {
    const named = { appId: "m", name: "Mock", type: "web", details: { url: "https://m.example" } }
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ applications: [named] })))),
    )

    expect(await fetchAppDirectory("https://directory.example/v2/apps")).toEqual([named])
  })

  it("still rejects an app with neither name nor title", async () => {
    const nameless = { appId: "x", type: "web", details: { url: "https://x.example" } }
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ applications: [nameless] })))),
    )

    await expect(fetchAppDirectory("https://directory.example/v2/apps")).rejects.toThrow(
      /missing required fields/,
    )
  })
})

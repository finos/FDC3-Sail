import { describe, expect, it } from "vitest"
import { createSailPlatformCatalog, type SailCatalogProvider } from "../index"

describe("createSailPlatformCatalog", () => {
  it("merges providers and later wins on appId", async () => {
    const catalog = createSailPlatformCatalog()
    const a: SailCatalogProvider = {
      list: () => [{ appId: "chart", title: "Chart" }],
    }
    const b: SailCatalogProvider = {
      list: () => [
        { appId: "chart", title: "Chart B" },
        { appId: "news", title: "News" },
      ],
    }
    catalog.addProvider(a)
    catalog.addProvider(b)
    const apps = await catalog.list()
    expect(apps).toHaveLength(2)
    expect(apps.find(x => x.appId === "chart")?.title).toBe("Chart B")
  })

  it("awaits async providers", async () => {
    const catalog = createSailPlatformCatalog()
    catalog.addProvider({
      list: async () => {
        await Promise.resolve()
        return [{ appId: "async", title: "Async" }]
      },
    })
    await expect(catalog.list()).resolves.toEqual([{ appId: "async", title: "Async" }])
  })

  it("removeProvider drops that source", async () => {
    const catalog = createSailPlatformCatalog()
    const provider: SailCatalogProvider = {
      list: () => [{ appId: "x", title: "X" }],
    }
    catalog.addProvider(provider)
    expect(await catalog.list()).toHaveLength(1)
    catalog.removeProvider(provider)
    expect(await catalog.list()).toHaveLength(0)
  })
})

import { beforeEach, describe, expect, it } from "vite-plus/test"

import { createLocalStorage } from "../local"
import { createMemoryStorage } from "../memory"
import type { SailStorage } from "../types"

/** Minimal in-process `Storage`, so the local adapter can be tested without a DOM. */
function createFakeStorage(): Storage {
  const entries = new Map<string, string>()

  return {
    get length() {
      return entries.size
    },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value)
    },
    removeItem: (key: string) => {
      entries.delete(key)
    },
    clear: () => {
      entries.clear()
    },
  }
}

describe.each<[string, () => SailStorage]>([
  ["memory", () => createMemoryStorage()],
  ["local", () => createLocalStorage({ backing: createFakeStorage() })],
])("SailStorage (%s)", (_name, create) => {
  let storage: SailStorage

  beforeEach(() => {
    storage = create()
  })

  it("round-trips a value", async () => {
    await storage.set("config", { tabs: ["one"], count: 2 })
    await expect(storage.get("config")).resolves.toEqual({ tabs: ["one"], count: 2 })
  })

  it("resolves null for an absent key", async () => {
    await expect(storage.get("nothing")).resolves.toBeNull()
  })

  it("replaces a previously stored value", async () => {
    await storage.set("config", { version: 1 })
    await storage.set("config", { version: 2 })
    await expect(storage.get("config")).resolves.toEqual({ version: 2 })
  })

  it("removes a key, and removing an absent key is not an error", async () => {
    await storage.set("config", { version: 1 })
    await storage.remove("config")
    await expect(storage.get("config")).resolves.toBeNull()
    await expect(storage.remove("config")).resolves.toBeUndefined()
  })

  it("lists keys, filtered by prefix", async () => {
    await storage.set("workspace:a", { name: "a" })
    await storage.set("workspace:b", { name: "b" })
    await storage.set("other", { name: "c" })

    await expect(storage.list()).resolves.toEqual(
      expect.arrayContaining(["workspace:a", "workspace:b", "other"]),
    )
    const scoped = await storage.list("workspace:")
    expect(scoped.sort()).toEqual(["workspace:a", "workspace:b"])
  })

  it("isolates stored state from later mutation of the caller's object", async () => {
    const value = { tabs: ["one"] }
    await storage.set("config", value)
    value.tabs.push("two")

    await expect(storage.get("config")).resolves.toEqual({ tabs: ["one"] })
  })
})

describe("createLocalStorage", () => {
  it("prefixes keys in the backing store and strips the prefix again on list", async () => {
    const backing = createFakeStorage()
    const storage = createLocalStorage({ keyPrefix: "sail_one_", backing })

    await storage.set("config", { ok: true })

    expect(backing.getItem("sail_one_config")).toBe(JSON.stringify({ ok: true }))
    await expect(storage.list()).resolves.toEqual(["config"])
  })

  it("ignores entries belonging to another prefix", async () => {
    const backing = createFakeStorage()
    backing.setItem("other_app_config", JSON.stringify({ ok: false }))
    const storage = createLocalStorage({ keyPrefix: "sail_one_", backing })

    await storage.set("config", { ok: true })

    await expect(storage.list()).resolves.toEqual(["config"])
    await expect(storage.get("config")).resolves.toEqual({ ok: true })
  })

  it("resolves null rather than throwing when a stored value is corrupt", async () => {
    const backing = createFakeStorage()
    backing.setItem("sail_config", "{ not json")
    const storage = createLocalStorage({ backing })

    await expect(storage.get("config")).resolves.toBeNull()
  })
})

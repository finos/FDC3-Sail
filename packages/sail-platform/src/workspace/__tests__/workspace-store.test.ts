import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createMemoryStorage } from "../../storage/memory"
import type { SailStorage } from "../../storage/types"
import { createWorkspaceStore, type WorkspaceStore } from "../store"
import type { Workspace } from "../types"

/** Deterministic ids and clock, so assertions can name what they expect. */
function createStore(storage: SailStorage = createMemoryStorage()): WorkspaceStore {
  let id = 0
  let clock = 1_000
  return createWorkspaceStore({
    storage,
    createId: () => `id-${++id}`,
    now: () => (clock += 10),
  })
}

/** The active workspace, asserted to exist. */
function active(store: WorkspaceStore): Workspace {
  const { workspace } = store.getSnapshot()
  if (workspace === null) {
    throw new Error("expected an active workspace")
  }
  return workspace
}

describe("createWorkspaceStore", () => {
  let store: WorkspaceStore

  beforeEach(() => {
    store = createStore()
  })

  describe("before anything is loaded", () => {
    it("starts empty", () => {
      expect(store.getSnapshot()).toEqual({ workspace: null, saved: [] })
    })

    it("refuses mutations that need an active workspace", () => {
      expect(() => store.addTab("Second")).toThrow(/No workspace loaded/)
      expect(() => store.rename("nope")).toThrow(/No workspace loaded/)
    })
  })

  describe("create", () => {
    it("makes a workspace with one tab, active and unsaved", () => {
      const workspace = store.create("Trading")

      expect(workspace.name).toBe("Trading")
      expect(workspace.savedAt).toBe(0)
      expect(workspace.layout.tabs).toHaveLength(1)
      expect(workspace.layout.activeTabId).toBe(workspace.layout.tabs[0]!.id)
      expect(store.getSnapshot().workspace).toEqual(workspace)
    })

    it("defaults to the rects lane", () => {
      expect(store.create("Trading").layout.geometry).toEqual({ mode: "rects" })
    })

    it("accepts caller-supplied tabs and geometry", () => {
      const workspace = store.create("Trading", {
        geometry: { mode: "renderer", state: { dockview: true } },
        tabs: [{ id: "tab-a", name: "A", panels: [] }],
      })

      expect(workspace.layout.tabs).toEqual([{ id: "tab-a", name: "A", panels: [] }])
      expect(workspace.layout.activeTabId).toBe("tab-a")
      expect(workspace.layout.geometry).toEqual({ mode: "renderer", state: { dockview: true } })
    })
  })

  describe("tabs", () => {
    beforeEach(() => {
      store.create("Trading")
    })

    it("adds, renames and activates", () => {
      const tab = store.addTab("Research", { icon: "book.svg", background: "#0061F2" })

      expect(active(store).layout.tabs).toHaveLength(2)
      expect(tab.icon).toBe("book.svg")

      store.renameTab(tab.id, "Reading")
      store.activateTab(tab.id)

      const layout = active(store).layout
      expect(layout.tabs[1]!.name).toBe("Reading")
      expect(layout.activeTabId).toBe(tab.id)
    })

    it("moves the active tab when the active one is removed", () => {
      const first = active(store).layout.tabs[0]!
      const second = store.addTab("Research")

      store.activateTab(second.id)
      store.removeTab(second.id)

      expect(active(store).layout.activeTabId).toBe(first.id)
    })

    it("leaves the active tab alone when another is removed", () => {
      const first = active(store).layout.tabs[0]!
      const second = store.addTab("Research")

      store.removeTab(second.id)

      expect(active(store).layout.activeTabId).toBe(first.id)
    })

    it("rejects unknown tab ids", () => {
      expect(() => store.activateTab("ghost")).toThrow(/Tab "ghost" not found/)
      expect(() => store.renameTab("ghost", "x")).toThrow(/Tab "ghost" not found/)
    })
  })

  describe("panels", () => {
    const chart = { appId: "chart", title: "Chart", url: "https://example.test/chart" }

    beforeEach(() => {
      store.create("Trading")
    })

    it("adds a panel to a tab, minting an id", () => {
      const tabId = active(store).layout.tabs[0]!.id
      const panel = store.addPanel(tabId, chart)

      expect(panel.id).toMatch(/^id-/)
      expect(active(store).layout.tabs[0]!.panels).toEqual([panel])
    })

    it("keeps a caller-supplied panel id", () => {
      const tabId = active(store).layout.tabs[0]!.id
      expect(store.addPanel(tabId, { ...chart, id: "instance-7" }).id).toBe("instance-7")
    })

    it("removes a panel", () => {
      const tabId = active(store).layout.tabs[0]!.id
      const panel = store.addPanel(tabId, chart)

      store.removePanel(panel.id)

      expect(active(store).layout.tabs[0]!.panels).toEqual([])
    })

    it("moves a panel between tabs without duplicating it", () => {
      const firstTab = active(store).layout.tabs[0]!.id
      const secondTab = store.addTab("Research").id
      const panel = store.addPanel(firstTab, chart)

      store.movePanel(panel.id, secondTab)

      const tabs = active(store).layout.tabs
      expect(tabs[0]!.panels).toEqual([])
      expect(tabs[1]!.panels).toEqual([panel])
    })

    it("rejects unknown panels and tabs", () => {
      const tabId = active(store).layout.tabs[0]!.id
      expect(() => store.addPanel("ghost", chart)).toThrow(/Tab "ghost" not found/)
      expect(() => store.movePanel("ghost", tabId)).toThrow(/Panel "ghost" not found/)
    })
  })

  describe("geometry lanes", () => {
    const chart = { appId: "chart", title: "Chart", url: "https://example.test/chart" }

    it("switches to the renderer lane when renderer state is stored", () => {
      store.create("Trading")
      store.setRendererState({ dockview: "serialised" })

      expect(active(store).layout.geometry).toEqual({
        mode: "renderer",
        state: { dockview: "serialised" },
      })
    })

    it("sets a rect in the rects lane", () => {
      store.create("Trading")
      const tabId = active(store).layout.tabs[0]!.id
      const panel = store.addPanel(tabId, chart)

      store.setPanelRect(panel.id, { x: 0, y: 0, width: 4, height: 3 })

      expect(active(store).layout.tabs[0]!.panels[0]!.rect).toEqual({
        x: 0,
        y: 0,
        width: 4,
        height: 3,
      })
    })

    it("refuses a rect once a renderer owns the arrangement", () => {
      store.create("Trading")
      const tabId = active(store).layout.tabs[0]!.id
      const panel = store.addPanel(tabId, chart)
      store.setRendererState({ dockview: "serialised" })

      expect(() => store.setPanelRect(panel.id, { x: 0, y: 0, width: 1, height: 1 })).toThrow(
        /owned by a renderer/,
      )
    })
  })

  describe("persistence", () => {
    it("saves, stamps savedAt, and summarises", async () => {
      store.create("Trading")
      await store.save()

      const { workspace, saved } = store.getSnapshot()
      expect(workspace?.savedAt).toBeGreaterThan(0)
      expect(saved).toEqual([{ id: workspace?.id, name: "Trading", savedAt: workspace?.savedAt }])
    })

    it("does not duplicate a summary when the same workspace is saved twice", async () => {
      store.create("Trading")
      await store.save()
      store.rename("Trading Desk")
      await store.save()

      const { saved } = store.getSnapshot()
      expect(saved).toHaveLength(1)
      expect(saved[0]!.name).toBe("Trading Desk")
    })

    it("round-trips a saved workspace through a fresh store", async () => {
      const storage = createMemoryStorage()
      const first = createStore(storage)
      first.create("Trading")
      const tabId = active(first).layout.tabs[0]!.id
      first.addPanel(tabId, { appId: "chart", title: "Chart", url: "https://example.test/chart" })
      await first.save()
      const savedWorkspace = active(first)

      const second = createStore(storage)
      await second.load(savedWorkspace.id)

      expect(active(second)).toEqual(savedWorkspace)
    })

    it("lists saved workspaces newest first", async () => {
      const storage = createMemoryStorage()
      const first = createStore(storage)

      first.create("Older")
      await first.save()
      first.create("Newer")
      await first.save()

      const reader = createStore(storage)
      await reader.refresh()

      expect(reader.getSnapshot().saved.map(entry => entry.name)).toEqual(["Newer", "Older"])
    })

    it("rejects loading a workspace that is not stored", async () => {
      await expect(store.load("missing")).rejects.toThrow(/Workspace "missing" not found/)
    })

    it("clears the active workspace when it is the one removed", async () => {
      store.create("Trading")
      await store.save()
      const { id } = active(store)

      await store.remove(id)

      expect(store.getSnapshot()).toEqual({ workspace: null, saved: [] })
    })

    it("keeps the active workspace when a different one is removed", async () => {
      const storage = createMemoryStorage()
      const seeder = createStore(storage)
      seeder.create("Other")
      await seeder.save()
      const otherId = active(seeder).id

      seeder.create("Mine")
      await seeder.save()

      await seeder.remove(otherId)

      expect(active(seeder).name).toBe("Mine")
      expect(seeder.getSnapshot().saved.map(entry => entry.name)).toEqual(["Mine"])
    })
  })

  describe("subscription", () => {
    it("notifies listeners and hands out a new snapshot per mutation", () => {
      const listener = vi.fn()
      store.subscribe(listener)

      const before = store.getSnapshot()
      store.create("Trading")
      const after = store.getSnapshot()

      expect(listener).toHaveBeenCalledTimes(1)
      expect(after).not.toBe(before)
    })

    it("returns a stable snapshot when nothing changes", () => {
      store.create("Trading")
      expect(store.getSnapshot()).toBe(store.getSnapshot())
    })

    it("stops notifying after unsubscribe", () => {
      const listener = vi.fn()
      const unsubscribe = store.subscribe(listener)

      unsubscribe()
      store.create("Trading")

      expect(listener).not.toHaveBeenCalled()
    })
  })
})

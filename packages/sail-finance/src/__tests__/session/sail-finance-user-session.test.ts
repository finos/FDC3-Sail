import { beforeEach, describe, expect, it } from "vite-plus/test"
import { createSailPlatformCatalog } from "@finos/sail-platform"
import { createPopupCloseWatcher } from "@finos/sail-platform-browser"
import { SailFinanceUserSession } from "../../session/sail-finance-user-session"
import { useWorkspaceStore } from "../../stores/workspace-store"

describe("SailFinanceUserSession", () => {
  beforeEach(() => {
    localStorage.clear()
    const store = useWorkspaceStore.getState()
    // Reset to a fresh default workspace by recreating via store API if needed.
    for (const ws of [...store.workspaces.values()]) {
      if (store.workspaces.size > 1) {
        store.deleteWorkspace(ws.uuid)
      }
    }
    const active = store.getWorkspace(store.activeWorkspaceId)
    if (active) {
      for (const tab of active.layout.tabs.values()) {
        for (const panelId of [...tab.panels.keys()]) {
          store.removePanel(active.uuid, tab.tabId, panelId)
        }
      }
    }
  })

  it("rehydrates apps from workspace panels on load", () => {
    const store = useWorkspaceStore.getState()
    const ws = store.getWorkspace(store.activeWorkspaceId)!
    const tabId = ws.layout.activeTabId
    store.addPanel(ws.uuid, tabId, {
      panelId: "restored-1",
      appId: "demo",
      title: "Demo",
      url: "https://demo.example",
      icon: null,
    })

    const session = new SailFinanceUserSession({
      catalog: createSailPlatformCatalog(),
      popupWatcher: createPopupCloseWatcher({ onPopupClosed: () => {} }),
    })
    session.load()

    expect(session.getSnapshot().apps).toEqual([
      expect.objectContaining({ instanceId: "restored-1", appId: "demo" }),
    ])
  })

  it("closeApp removes the workspace panel", async () => {
    const catalog = createSailPlatformCatalog()
    catalog.addProvider({
      list: () => [{ appId: "demo", title: "Demo", url: "https://demo.example" }],
    })

    const session = new SailFinanceUserSession({
      catalog,
      popupWatcher: createPopupCloseWatcher({ onPopupClosed: () => {} }),
      createAppInstanceId: () => "inst-1",
    })
    session.load()

    await session.openApp({
      appId: "demo",
      url: "https://demo.example",
      title: "Demo",
    })
    expect(session.getSnapshot().apps).toHaveLength(1)

    const store = useWorkspaceStore.getState()
    const ws = store.getWorkspace(store.activeWorkspaceId)!
    expect(store.getPanel(ws.uuid, ws.layout.activeTabId, "inst-1")).toBeDefined()

    await session.closeApp("inst-1")
    expect(session.getSnapshot().apps).toHaveLength(0)
    expect(store.getPanel(ws.uuid, ws.layout.activeTabId, "inst-1")).toBeUndefined()
  })
})

import { beforeEach, describe, expect, it } from "vite-plus/test"
import type { SailWebApp } from "@finos/sail-platform"
import { PlatformClientState } from "../client-state"
import { installLocalStorage } from "./local-storage-mock"

/** The `SailUserStorage` localStorage backend writes state under `<prefix>config`. */
const STORAGE_KEY = "sail_one_config"

async function loadedState(): Promise<PlatformClientState> {
  const state = new PlatformClientState()
  await state.load()
  return state
}

describe("PlatformClientState", () => {
  beforeEach(() => {
    installLocalStorage()
  })

  it("loads default tabs when storage is empty", async () => {
    const state = await loadedState()

    expect(state.getTabs()).toHaveLength(3)
    expect(state.getActiveTab().id).toBe("One")
    expect(state.getUserSessionID()).toMatch(/^user-/)
  })

  it("newPanel persists a web app panel for the active tab", async () => {
    const state = await loadedState()
    const app: SailWebApp = {
      appId: "demo",
      title: "Demo",
      url: "https://app.example/",
    }
    const panel = state.newPanel(app, "inst-1", "Demo 1")

    expect(panel).toMatchObject({
      panelId: "inst-1",
      appId: "demo",
      title: "Demo 1",
      url: "https://app.example/",
      tabId: "One",
    })
    expect(state.getPanels()).toHaveLength(1)
  })

  it("rehydrates from platform storage", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tabs: [
          {
            id: "Saved",
            icon: "/icons/tabs/noun-airplane-3707662.svg",
            background: "#0061F2",
          },
        ],
        panels: [],
        activeTabId: "Saved",
        userSessionId: "user-fixed",
      }),
    )

    const state = await loadedState()
    expect(state.getUserSessionID()).toBe("user-fixed")
    expect(state.getActiveTab().id).toBe("Saved")
  })

  it("getActiveTab does not throw once every tab has been removed", async () => {
    const state = await loadedState()
    for (const tab of state.getTabs().slice()) {
      await state.removeTab(tab.id)
    }

    expect(() => state.getActiveTab()).not.toThrow()
  })

  it("removeTab keeps at least one tab when removing the last remaining one", async () => {
    const state = await loadedState()
    for (const tab of state.getTabs().slice()) {
      await state.removeTab(tab.id)
    }

    expect(state.getTabs().length).toBeGreaterThan(0)
  })
})

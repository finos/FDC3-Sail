import { beforeEach, describe, expect, it } from "vite-plus/test"
import type { DirectoryApp } from "@finos/sail-desktop-agent"
import { PlatformClientState } from "../client-state"
import { installLocalStorage } from "./local-storage-mock"

/** The `SailStorage` localStorage backend writes state under `<prefix>config`. */
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

  it("loads default tabs and FINOS directory when storage is empty", async () => {
    const state = await loadedState()

    expect(state.getTabs()).toHaveLength(3)
    expect(state.getActiveTab().id).toBe("One")
    expect(state.getDirectories()).toEqual([
      {
        label: "FINOS FDC3 Directory",
        url: "https://directory.fdc3.finos.org/v2/apps",
        active: true,
      },
    ])
    expect(state.getUserSessionID()).toMatch(/^user-/)
  })

  it("createArgs only includes active directory URLs", async () => {
    const state = await loadedState()
    await state.setDirectories([
      {
        label: "Active",
        url: "https://example.com/v2/apps",
        active: true,
      },
      {
        label: "Inactive",
        url: "https://other.example/v2/apps",
        active: false,
      },
    ])

    expect(state.createArgs().directories).toEqual(["https://example.com/v2/apps"])
  })

  it("persists custom apps into createArgs and platform storage", async () => {
    const customApps: DirectoryApp[] = [
      {
        appId: "demo",
        name: "Demo",
        title: "Demo",
        type: "web",
        details: { url: "https://app.example/" },
      },
    ]
    const state = await loadedState()
    await state.setCustomApps(customApps)

    expect(state.createArgs().customApps).toEqual(customApps)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.customApps).toEqual(customApps)
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
        directories: [
          {
            label: "Local",
            url: "https://local.example/v2/apps",
            active: true,
          },
        ],
        customApps: [],
      }),
    )

    const state = await loadedState()
    expect(state.getUserSessionID()).toBe("user-fixed")
    expect(state.getActiveTab().id).toBe("Saved")
    expect(state.getDirectories()[0]!.url).toBe("https://local.example/v2/apps")
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

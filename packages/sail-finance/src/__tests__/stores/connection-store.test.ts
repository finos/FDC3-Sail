import { enableMapSet } from "immer"
import { describe, it, expect } from "vite-plus/test"
import appBarSlotSource from "../../components/extensions/AppBarSlot.tsx?raw"
import connectionStoreSource from "../../stores/connection-store.ts?raw"
import { createConnectionStore } from "../../stores/connection-store"

enableMapSet()

const PANEL_ID = "test-panel-1"
const APP_ID = "test-app"

describe("ConnectionStore panel registration", () => {
  it("registers a panel with panelId as the provisional instance id", () => {
    const store = createConnectionStore()
    store.getState().registerPanel(PANEL_ID, APP_ID)

    expect(store.getState().getConnectionByPanelId(PANEL_ID)?.instanceId).toBe(PANEL_ID)
    expect(store.getState().getConnection(PANEL_ID)?.appId).toBe(APP_ID)
    expect(store.getState().getConnection(PANEL_ID)?.status).toBe("connected")
  })

  it("removes panel mappings", () => {
    const store = createConnectionStore()
    store.getState().registerPanel(PANEL_ID, APP_ID)
    store.getState().removePanel(PANEL_ID)

    expect(store.getState().getConnectionByPanelId(PANEL_ID)).toBeUndefined()
    expect(store.getState().getConnection(PANEL_ID)).toBeUndefined()
  })
})

describe("Channel UI source audit", () => {
  it("connection-store and AppBarSlot stay free of agent channel APIs", () => {
    expect(connectionStoreSource).not.toMatch(/getState\s*\(/)
    expect(connectionStoreSource).not.toMatch(/onAppChannelChange/)
    expect(appBarSlotSource).toMatch(/SAIL_UI_APP_BAR/)
    expect(appBarSlotSource).toMatch(/properties:\s*\{\s*instanceId/)
    expect(connectionStoreSource).not.toMatch(/agent\.appConnection/)
  })
})

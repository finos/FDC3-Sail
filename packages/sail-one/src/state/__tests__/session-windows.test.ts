import { beforeEach, describe, expect, it } from "vite-plus/test"
import { createSailPlatformCatalog, type SailWebApp } from "@finos/sail-platform"
import { createPopupCloseWatcher } from "@finos/sail-platform-browser"
import { SailOneUserSession } from "../sail-one-user-session"
import { PlatformClientState } from "../client-state"
import { installLocalStorage } from "./local-storage-mock"

describe("SailOneUserSession host windows", () => {
  beforeEach(() => {
    installLocalStorage()
  })

  it("stores Window associations on the session", async () => {
    const win = {} as Window
    const catalog = createSailPlatformCatalog()
    const popupWatcher = createPopupCloseWatcher({ onPopupClosed: () => {} })
    const session = new SailOneUserSession({
      catalog,
      popupWatcher,
      createAppInstanceId: () => "inst-1",
      clientState: new PlatformClientState(),
    })
    await session.load()

    const id = await session.openApp({ appId: "demo", url: "https://demo.example", title: "Demo" })
    session.registerHostWindow(win, id)
    expect(session.getHostWindow(id)).toBe(win)
    expect(session.getInstanceIdForHostWindow(win)).toBe(id)
    await session.closeApp(id)
    expect(session.getHostWindow(id)).toBeUndefined()
  })

  it("rehydrates apps from persisted panels on load", async () => {
    const catalog = createSailPlatformCatalog()
    const popupWatcher = createPopupCloseWatcher({ onPopupClosed: () => {} })
    const clientState = new PlatformClientState()
    await clientState.load()
    const app: SailWebApp = {
      appId: "demo",
      title: "Demo",
      url: "https://demo.example",
    }
    clientState.newPanel(app, "restored-1", "Demo 1")

    const session = new SailOneUserSession({
      catalog,
      popupWatcher,
      clientState,
    })
    await session.load()
    expect(session.getSnapshot().apps).toEqual([
      expect.objectContaining({
        instanceId: "restored-1",
        appId: "demo",
      }),
    ])
  })
})

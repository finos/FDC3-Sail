import { describe, expect, it } from "vite-plus/test"
import { createSailUserSession } from "@finos/sail-platform"

describe("SailUserSession host windows", () => {
  it("stores Window associations on the session", async () => {
    const win = {} as Window
    const session = createSailUserSession({
      createAppInstanceId: () => "inst-1",
    })
    session.createContainer("c1", {})
    const id = await session.openApp({ appId: "demo", within: "c1", url: "https://demo.example" })
    session.registerHostWindow(win, id)
    expect(session.getHostWindow(id)).toBe(win)
    expect(session.getInstanceIdForHostWindow(win)).toBe(id)
    await session.closeApp(id)
    expect(session.getHostWindow(id)).toBeUndefined()
  })
})

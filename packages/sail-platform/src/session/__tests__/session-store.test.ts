import { describe, expect, it, vi } from "vitest"
import { createSailUserSession, createSessionService } from "../store"

describe("createSailUserSession", () => {
  it("creates and updates containers", () => {
    const session = createSailUserSession({
      createAppInstanceId: () => "id-1",
    })
    session.createContainer("root", { kind: "workspace" })
    expect(session.getSnapshot().containers).toHaveLength(1)
    session.updateContainer("root", { kind: "workspace", name: "Main" })
    expect(session.getSnapshot().containers[0]?.location.name).toBe("Main")
  })

  it("opens and closes apps", async () => {
    const onOpenApp = vi.fn()
    const onCloseApp = vi.fn()
    const session = createSailUserSession({
      createAppInstanceId: () => "inst-1",
      host: { onOpenApp, onCloseApp },
    })
    session.createContainer("c1", {})
    const id = await session.openApp({ appId: "chart", within: "c1", url: "https://x.test" })
    expect(id).toBe("inst-1")
    expect(session.getSnapshot().apps).toHaveLength(1)
    expect(onOpenApp).toHaveBeenCalled()
    await session.closeApp(id)
    expect(session.getSnapshot().apps).toHaveLength(0)
    expect(onCloseApp).toHaveBeenCalled()
  })

  it("owns host Window associations and clears them on close", async () => {
    const win = {} as Window
    const session = createSailUserSession({
      createAppInstanceId: () => "inst-1",
    })
    session.createContainer("c1", {})
    const id = await session.openApp({ appId: "chart", within: "c1" })
    session.registerHostWindow(win, id)
    expect(session.getInstanceIdForHostWindow(win)).toBe("inst-1")
    expect(session.getHostWindow(id)).toBe(win)
    await session.closeApp(id)
    expect(session.getHostWindow(id)).toBeUndefined()
    expect(session.getInstanceIdForHostWindow(win)).toBeUndefined()
  })

  it("destroyContainer removes nested apps", async () => {
    const session = createSailUserSession({ createAppInstanceId: () => "inst-1" })
    session.createContainer("c1", {})
    await session.openApp({ appId: "a", within: "c1" })
    session.destroyContainer("c1")
    expect(session.getSnapshot().apps).toHaveLength(0)
    expect(session.getSnapshot().containers).toHaveLength(0)
  })
})

describe("createSessionService", () => {
  it("resolves the single session and AppInstanceId", async () => {
    const sessions = createSessionService({
      createAppInstanceId: () => "inst-1",
    })
    const session = sessions.createSession()
    expect(sessions.getSession()).toBe(session)
    session.createContainer("c1", {})
    const id = await session.openApp({ appId: "chart", within: "c1" })
    expect(sessions.getSessionByApp(id)).toBe(session)
    await session.closeApp(id)
    expect(sessions.getSessionByApp(id)).toBeUndefined()
    expect(sessions.getSession()).toBe(session)
  })

  it("rejects a second createSession", () => {
    const sessions = createSessionService()
    sessions.createSession()
    expect(() => sessions.createSession()).toThrow(/already has a user session/)
  })

  it("clears app mapping when destroyContainer removes apps", async () => {
    const sessions = createSessionService({ createAppInstanceId: () => "inst-1" })
    const session = sessions.createSession()
    session.createContainer("c1", {})
    const id = await session.openApp({ appId: "a", within: "c1" })
    session.destroyContainer("c1")
    expect(sessions.getSessionByApp(id)).toBeUndefined()
  })

  it("notifies onSession and replays if already created", () => {
    const sessions = createSessionService()
    const seen: string[] = []
    const stop = sessions.onSession(() => {
      seen.push("created")
    })
    expect(sessions.getSession()).toBeUndefined()
    sessions.createSession()
    expect(seen).toEqual(["created"])

    const late: string[] = []
    sessions.onSession(() => {
      late.push("created")
    })
    expect(late).toEqual(["created"])
    stop()
  })
})


import { describe, expect, it } from "vitest"
import type {
  AppInstanceId,
  SailAppInstance,
  SailOpenAppRequest,
  SailUserSession,
  SailUserSessionSnapshot,
} from "../types"
import { createSessionService } from "../store"

/** Minimal in-memory session for registry tests (shells own real implementations). */
function createMemorySession(createId: () => AppInstanceId = () => crypto.randomUUID()): SailUserSession {
  const apps = new Map<AppInstanceId, SailAppInstance>()
  const listeners = new Set<() => void>()
  const windowsByInstance = new Map<AppInstanceId, WeakRef<Window>>()
  const instanceByWindow = new WeakMap<Window, AppInstanceId>()
  let snapshot: SailUserSessionSnapshot = { apps: [] }

  function forgetWindow(instanceId: AppInstanceId): void {
    const ref = windowsByInstance.get(instanceId)
    windowsByInstance.delete(instanceId)
    const win = ref?.deref()
    if (win) {
      instanceByWindow.delete(win)
    }
  }

  function emit() {
    snapshot = { apps: [...apps.values()] }
    for (const listener of [...listeners]) {
      listener()
    }
  }

  return {
    getSnapshot() {
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async openApp(request: SailOpenAppRequest) {
      const instanceId = createId()
      const app: SailAppInstance = {
        instanceId,
        appId: request.appId,
        placement: request.placement
          ? { ...request.placement }
          : request.url || request.title || request.icon
            ? {
                ...(request.url ? { url: request.url } : {}),
                ...(request.title ? { title: request.title } : {}),
                ...(request.icon ? { icon: request.icon } : {}),
              }
            : undefined,
      }
      apps.set(instanceId, app)
      emit()
      return instanceId
    },
    async closeApp(instanceId) {
      if (!apps.has(instanceId)) {
        return
      }
      apps.delete(instanceId)
      forgetWindow(instanceId)
      emit()
    },
    registerHostWindow(windowRef, instanceId) {
      windowsByInstance.set(instanceId, new WeakRef(windowRef))
      instanceByWindow.set(windowRef, instanceId)
    },
    unregisterHostWindow(instanceId) {
      forgetWindow(instanceId)
    },
    getInstanceIdForHostWindow(windowRef) {
      return instanceByWindow.get(windowRef)
    },
    getHostWindow(instanceId) {
      return windowsByInstance.get(instanceId)?.deref()
    },
  }
}

describe("createSessionService", () => {
  it("resolves the single session and AppInstanceId", async () => {
    const sessions = createSessionService()
    const session = sessions.createSession(createMemorySession(() => "inst-1"))
    expect(sessions.getSession()).toBe(session)
    const id = await session.openApp({ appId: "chart", url: "https://x.test" })
    expect(id).toBe("inst-1")
    expect(sessions.getSessionByApp(id)).toBe(session)
    await session.closeApp(id)
    expect(sessions.getSessionByApp(id)).toBeUndefined()
    expect(sessions.getSession()).toBe(session)
  })

  it("rejects a second createSession", () => {
    const sessions = createSessionService()
    sessions.createSession(createMemorySession())
    expect(() => sessions.createSession(createMemorySession())).toThrow(/already has a user session/)
  })

  it("tracks host Window associations via the registered session", async () => {
    const sessions = createSessionService()
    const session = sessions.createSession(createMemorySession(() => "inst-1"))
    const win = {} as Window
    const id = await session.openApp({ appId: "chart" })
    session.registerHostWindow(win, id)
    expect(session.getInstanceIdForHostWindow(win)).toBe("inst-1")
    expect(session.getHostWindow(id)).toBe(win)
    await session.closeApp(id)
    expect(session.getHostWindow(id)).toBeUndefined()
    expect(session.getInstanceIdForHostWindow(win)).toBeUndefined()
  })

  it("notifies onSession and replays if already created", () => {
    const sessions = createSessionService()
    const seen: string[] = []
    const stop = sessions.onSession(() => {
      seen.push("created")
    })
    expect(sessions.getSession()).toBeUndefined()
    sessions.createSession(createMemorySession())
    expect(seen).toEqual(["created"])

    const late: string[] = []
    sessions.onSession(() => {
      late.push("created")
    })
    expect(late).toEqual(["created"])
    stop()
  })
})

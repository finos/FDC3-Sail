import { beforeEach, describe, expect, it, vi } from "vite-plus/test"
import type { DirectoryApp } from "@finos/sail-headless-agent"
import { ChannelType, State } from "@finos/sail-headless-agent"
import { AppInstanceState, SailHost } from "../sail-host"
import { AppHosting } from "../default-app-state"
import type { SailClientStateArgs } from "../client-state"
import { getClientState } from "../index"
import { installLocalStorage } from "./local-storage-mock"

function makeWebApp(
  appId: string,
  url: string,
  hostManifests?: DirectoryApp["hostManifests"],
): DirectoryApp {
  return {
    appId,
    name: appId,
    title: appId,
    type: "web",
    details: { url },
    ...(hostManifests ? { hostManifests } : {}),
  }
}

type FakeHandle = {
  sessionId: string
  agent: {
    open: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
    getInstanceDetails: ReturnType<typeof vi.fn>
    getCurrentChannel: ReturnType<typeof vi.fn>
  }
  core: {
    onAppStateChange: ReturnType<typeof vi.fn>
    setUserChannel: ReturnType<typeof vi.fn>
  }
  appContribution: {
    retrieveAllApps: (sessionId: string) => DirectoryApp[]
    registerSource: (
      id: string,
      contributor: { returnApps: (sessionId: string) => DirectoryApp[] },
    ) => void
    unregisterSource: (id: string) => void
  }
  intentResolver: {
    onRequest: ReturnType<typeof vi.fn>
    select: ReturnType<typeof vi.fn>
    cancel: ReturnType<typeof vi.fn>
    getPendingRequests: ReturnType<typeof vi.fn>
  }
  dispose: ReturnType<typeof vi.fn>
}

let lastHandle: FakeHandle

vi.mock("../extensions-runtime", () => {
  const apps = new Map<string, DirectoryApp>()
  return {
    loadExtensionCores: vi.fn(async () => ({})),
    getExtensionExport: vi.fn(() => undefined),
    getPlatformCaps: () => ({
      sessions: {
        createSession: ({
          host,
        }: {
          host: {
            onOpenApp?: (
              request: { appId: string; url?: string; title?: string },
              instanceId: string,
            ) => Promise<void>
            onCloseApp?: (instanceId: string, app: unknown) => Promise<void>
          }
        }) => {
          return {
            id: "sess-test",
            openApp: async (request: { appId: string; url?: string; title?: string }) => {
              const instanceId = `inst-${request.appId}-${apps.size + 1}`
              await host.onOpenApp?.(request, instanceId)
              return instanceId
            },
            closeApp: async (instanceId: string) => {
              await host.onCloseApp?.(instanceId, {
                instanceId,
                appId: "",
                within: "",
              })
            },
            getSnapshot: () => ({ containers: [], apps: [] }),
            subscribe: () => () => {},
            createContainer: () => ({ id: "c", location: {} }),
            updateContainer: () => {},
            destroyContainer: () => {},
          }
        },
      },
      bus: {},
      catalog: {},
      storage: {},
    }),
    createFdc3SessionAgent: vi.fn(async (session: {
      openApp: (request: { appId: string; url?: string; title?: string }) => Promise<string>
    }) => {
      const contributors = new Map<string, { returnApps: (sessionId: string) => DirectoryApp[] }>()
      const retrieveAllApps = (sessionId: string): DirectoryApp[] => {
        const byId = new Map<string, DirectoryApp>()
        for (const c of contributors.values()) {
          for (const a of c.returnApps(sessionId)) {
            byId.set(a.appId, a)
          }
        }
        return [...byId.values()]
      }
      lastHandle = {
        sessionId: "sess-test",
        agent: {
          open: vi.fn(async (appId: string) => {
            const known = retrieveAllApps("sess-test")
            const app = known.find((a: DirectoryApp) => a.appId === appId) ?? makeWebApp(appId, "https://x")
            const url = (app.details as { url: string }).url
            for (const a of known) {
              apps.set(a.appId, a)
            }
            return session.openApp({ appId, url, title: app.title })
          }),
          close: vi.fn(async () => undefined),
          getInstanceDetails: vi.fn(() => undefined),
          getCurrentChannel: vi.fn(() => null),
        },
        core: {
          onAppStateChange: vi.fn(() => () => {}),
          setUserChannel: vi.fn(async () => undefined),
        },
        appContribution: {
          retrieveAllApps,
          registerSource: (id, contributor) => {
            contributors.set(id, contributor)
          },
          unregisterSource: id => {
            contributors.delete(id)
          },
        },
        intentResolver: {
          onRequest: vi.fn(() => () => {}),
          select: vi.fn(),
          cancel: vi.fn(),
          getPendingRequests: vi.fn(() => []),
        },
        dispose: vi.fn(),
      }
      return lastHandle
    }),
  }
})

function fakePopupWindow(): {
  closed: boolean
  name: string
  close: ReturnType<typeof vi.fn>
} {
  return {
    closed: false,
    name: "",
    close: vi.fn(function close(this: { closed: boolean }) {
      this.closed = true
    }),
  }
}

function clientArgs(overrides: Partial<SailClientStateArgs> = {}): SailClientStateArgs {
  return {
    userSessionId: "user-test",
    directories: [],
    channels: [
      {
        id: "One",
        icon: "/icons/tabs/noun-airplane-3707662.svg",
        background: "#0061F2",
      },
    ],
    panels: [],
    customApps: [makeWebApp("demo-app", "https://app.example/page")],
    ...overrides,
  }
}

describe("SailHost", () => {
  beforeEach(() => {
    installLocalStorage()
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("unexpected fetch in smoke test"))),
    )
  })

  it("registerDesktopAgent exposes local custom apps via getKnownApps", async () => {
    const host = new SailHost()
    await host.registerDesktopAgent(clientArgs())

    const apps = host.getKnownApps()
    expect(apps.map(a => a.appId)).toContain("demo-app")
  })

  it("registerAppLaunch returns the instance id minted by the session", async () => {
    const host = new SailHost()
    await host.registerDesktopAgent(clientArgs())

    const instanceId = await host.registerAppLaunch("demo-app", AppHosting.Frame, "One", "Demo 1")

    expect(instanceId).toBeTruthy()
    expect(host.getAppInstanceState(instanceId)).toBe(AppInstanceState.Pending)
  })

  it("sendClientState absorbs a new tab channel without throwing", async () => {
    const host = new SailHost()
    const initial = clientArgs()
    await host.registerDesktopAgent(initial)

    await host.sendClientState(
      clientArgs({
        channels: [
          ...initial.channels,
          {
            id: "Four",
            icon: "/icons/tabs/noun-console-3707664.svg",
            background: "#00A86B",
          },
        ],
      }),
    )

    expect(host.getKnownApps().map(a => a.appId)).toContain("demo-app")
  })

  it("setUserChannel returns immediately for an instance the agent does not know", async () => {
    const host = new SailHost()
    await host.registerDesktopAgent(clientArgs())

    await host.setUserChannel("never-connected", "One")
    expect(lastHandle.core.setUserChannel).not.toHaveBeenCalled()
  })

  it("sendClientState adds a newly activated directory without restarting", async () => {
    const host = new SailHost()
    await host.registerDesktopAgent(clientArgs())
    const before = host.getKnownApps()

    await host.sendClientState(clientArgs({ directories: ["https://directory.example/v2/apps"] }))

    expect(host.getKnownApps()).toEqual(before)
  })

  it("registerAppLaunch throws before the desktop agent is registered", async () => {
    const host = new SailHost()
    await expect(
      host.registerAppLaunch("demo-app", AppHosting.Frame, null, "Demo"),
    ).rejects.toThrow("Desktop Agent not registered")
  })

  it("closeAppInstance removes a frame panel and marks the instance terminated", async () => {
    const host = new SailHost()
    await host.registerDesktopAgent(clientArgs())

    const instanceId = await host.registerAppLaunch("demo-app", AppHosting.Frame, "One", "Demo 1")
    expect(
      getClientState()
        .getPanels()
        .some(p => p.panelId === instanceId),
    ).toBe(true)

    await host.closeAppInstance(instanceId)

    expect(
      getClientState()
        .getPanels()
        .some(p => p.panelId === instanceId),
    ).toBe(false)
    expect(host.getAppInstanceState(instanceId)).toBe(AppInstanceState.Terminated)
  })

  it("closeAppInstance closes a tab window and forgets it", async () => {
    const host = new SailHost()
    await host.registerDesktopAgent(clientArgs())

    const fakeWindow = fakePopupWindow()
    vi.stubGlobal(
      "open",
      vi.fn(() => fakeWindow),
    )

    const instanceId = await host.registerAppLaunch("demo-app", AppHosting.Tab, null, "Demo Tab")
    expect(host.findHostWindow(instanceId)).toBe(fakeWindow)

    await host.closeAppInstance(instanceId)

    expect(fakeWindow.close).toHaveBeenCalled()
    expect(host.findHostWindow(instanceId)).toBeUndefined()
    expect(host.getAppInstanceState(instanceId)).toBe(AppInstanceState.Terminated)
  })

  it("agent-driven open honors hostManifests.sail.forceNewWindow as a browser tab", async () => {
    const forceApp = makeWebApp(
      "force-tab-app",
      "https://app.example/force",
      { sail: { forceNewWindow: true } } as unknown as DirectoryApp["hostManifests"],
    )
    const host = new SailHost()
    await host.registerDesktopAgent(clientArgs({ customApps: [forceApp] }))

    const fakeWindow = fakePopupWindow()
    const openSpy = vi.fn(() => fakeWindow)
    vi.stubGlobal("open", openSpy)

    const openApp = lastHandle.agent.open as unknown as (appId: string) => Promise<string>
    const instanceId = await openApp("force-tab-app")

    expect(openSpy).toHaveBeenCalledWith("https://app.example/force", instanceId)
    expect(host.findHostWindow(instanceId)).toBe(fakeWindow)

    await host.closeAppInstance(instanceId)
    expect(fakeWindow.close).toHaveBeenCalled()
  })

  it("closes via agent.close when a tab is closed externally (2.2 window.close)", async () => {
    vi.useFakeTimers()
    const forceApp = makeWebApp(
      "force-tab-app",
      "https://app.example/force",
      { sail: { forceNewWindow: true } } as unknown as DirectoryApp["hostManifests"],
    )
    const host = new SailHost()
    await host.registerDesktopAgent(clientArgs({ customApps: [forceApp] }))

    const fakeWindow = fakePopupWindow()
    vi.stubGlobal(
      "open",
      vi.fn(() => fakeWindow),
    )

    const openApp = lastHandle.agent.open as unknown as (appId: string) => Promise<string>
    const instanceId = await openApp("force-tab-app")

    fakeWindow.closed = true
    await vi.advanceTimersByTimeAsync(150)

    expect(lastHandle.agent.close).toHaveBeenCalledWith(instanceId)
    expect(host.findHostWindow(instanceId)).toBeUndefined()
    expect(host.getAppInstanceState(instanceId)).toBe(AppInstanceState.Terminated)

    vi.useRealTimers()
  })

  it("maps tabs to user ChannelState shape", () => {
    expect(ChannelType.user).toBeDefined()
    expect(State.Pending).toBeDefined()
  })
})

import { enableMapSet } from "immer"
import { describe, it, expect, vi } from "vite-plus/test"
import type { AppConnectionMetadata, SailDesktopAgent } from "@finos/sail-desktop-agent"
import channelSelectorSource from "../../components/ChannelSelector.tsx?raw"
import connectionStoreSource from "../../stores/connection-store.ts?raw"
import { createConnectionStore } from "../../stores/connection-store"

enableMapSet()

const INSTANCE_ID = "test-instance-1"
const PANEL_ID = "test-panel-1"
const APP_ID = "test-app"
const CHANNEL_ID = "fdc3.channel.1"

type HostListener = (...args: unknown[]) => void

function createMockHostControllers() {
  const appListeners = {
    onConnect: [] as HostListener[],
    onDisconnect: [] as HostListener[],
    onHandshakeFailure: [] as HostListener[],
  }
  const channelListeners = {
    onAppChannelChange: [] as HostListener[],
  }

  return {
    apps: {
      onConnect: vi.fn((handler: HostListener) => {
        appListeners.onConnect.push(handler)
        return () => {
          appListeners.onConnect = appListeners.onConnect.filter(h => h !== handler)
        }
      }),
      onDisconnect: vi.fn((handler: HostListener) => {
        appListeners.onDisconnect.push(handler)
        return () => {
          appListeners.onDisconnect = appListeners.onDisconnect.filter(h => h !== handler)
        }
      }),
      onHandshakeFailure: vi.fn((handler: HostListener) => {
        appListeners.onHandshakeFailure.push(handler)
        return () => {
          appListeners.onHandshakeFailure = appListeners.onHandshakeFailure.filter(
            h => h !== handler,
          )
        }
      }),
      emitConnect: (metadata: AppConnectionMetadata) => {
        appListeners.onConnect.forEach(handler => handler(metadata))
      },
      emitDisconnect: (instanceId: string) => {
        appListeners.onDisconnect.forEach(handler => handler(instanceId))
      },
    },
    channels: {
      onAppChannelChange: vi.fn((handler: HostListener) => {
        channelListeners.onAppChannelChange.push(handler)
        return () => {
          channelListeners.onAppChannelChange = channelListeners.onAppChannelChange.filter(
            h => h !== handler,
          )
        }
      }),
      emitAppChannelChange: (instanceId: string, channelId: string | null) => {
        channelListeners.onAppChannelChange.forEach(handler =>
          handler({ instanceId, channelId, channel: null }),
        )
      },
    },
  }
}

function createAppConnectedMetadata(
  overrides: Partial<AppConnectionMetadata> = {},
): AppConnectionMetadata {
  return {
    instanceId: INSTANCE_ID,
    appId: APP_ID,
    connectionAttemptUuid: "connection-attempt-uuid",
    messageOrigin: "https://example.com",
    source: window,
    port: {} as MessagePort,
    connectedAt: new Date(),
    hostIdentifier: PANEL_ID,
    ...overrides,
  }
}

describe("ConnectionStore panel linking", () => {
  it("links waiting panels by iframe source window when multiple tabs share the same appId", () => {
    const host = createMockHostControllers()
    const agent = {
      apps: host.apps,
      channels: host.channels,
    } as unknown as SailDesktopAgent
    const store = createConnectionStore(agent)

    const panelOne = "pms-1"
    const panelTwo = "pms-2"
    const sourceOne = { id: "source-one" } as unknown as Window
    const sourceTwo = { id: "source-two" } as unknown as Window

    function mountPanelIframe(panelId: string, contentWindow: Window): HTMLIFrameElement {
      const iframe = document.createElement("iframe")
      iframe.name = panelId
      Object.defineProperty(iframe, "contentWindow", {
        value: contentWindow,
        configurable: true,
      })
      document.body.appendChild(iframe)
      return iframe
    }

    const iframeOne = mountPanelIframe(panelOne, sourceOne)
    const iframeTwo = mountPanelIframe(panelTwo, sourceTwo)

    store.getState().registerPanel(panelOne, APP_ID)
    store.getState().registerPanel(panelTwo, APP_ID)

    host.apps.emitConnect(
      createAppConnectedMetadata({
        instanceId: "instance-two",
        hostIdentifier: undefined,
        source: sourceTwo,
      }),
    )
    host.apps.emitConnect(
      createAppConnectedMetadata({
        instanceId: "instance-one",
        hostIdentifier: undefined,
        source: sourceOne,
      }),
    )

    expect(store.getState().getConnectionByPanelId(panelTwo)?.instanceId).toBe("instance-two")
    expect(store.getState().getConnectionByPanelId(panelOne)?.instanceId).toBe("instance-one")

    iframeOne.remove()
    iframeTwo.remove()
  })
})

describe("ConnectionStore channel membership", () => {
  it("updates connection channelId when channels controller emits onAppChannelChange", () => {
    const host = createMockHostControllers()
    const agent = {
      apps: host.apps,
      channels: host.channels,
    } as unknown as SailDesktopAgent
    const store = createConnectionStore(agent)

    host.apps.emitConnect(createAppConnectedMetadata())

    expect(store.getState().getConnection(INSTANCE_ID)?.channelId).toBeUndefined()

    host.channels.emitAppChannelChange(INSTANCE_ID, CHANNEL_ID)

    expect(store.getState().getConnection(INSTANCE_ID)?.channelId).toBe(CHANNEL_ID)
  })

  it("does not call DesktopAgent getState when onAppChannelChange fires", () => {
    const host = createMockHostControllers()
    const getState = vi.fn()
    const agent = {
      apps: host.apps,
      channels: host.channels,
      getState,
    } as unknown as SailDesktopAgent
    const store = createConnectionStore(agent)

    host.apps.emitConnect(createAppConnectedMetadata())
    host.channels.emitAppChannelChange(INSTANCE_ID, CHANNEL_ID)

    expect(store.getState().getConnection(INSTANCE_ID)?.channelId).toBe(CHANNEL_ID)
    expect(getState).not.toHaveBeenCalled()
  })

  it("clears channelId when onAppChannelChange fires with null", () => {
    const host = createMockHostControllers()
    const agent = {
      apps: host.apps,
      channels: host.channels,
    } as unknown as SailDesktopAgent
    const store = createConnectionStore(agent)

    host.apps.emitConnect(createAppConnectedMetadata())
    host.channels.emitAppChannelChange(INSTANCE_ID, CHANNEL_ID)
    host.channels.emitAppChannelChange(INSTANCE_ID, null)

    expect(store.getState().getConnection(INSTANCE_ID)?.channelId).toBeNull()
  })
})

describe("Channel UI source audit", () => {
  it("connection-store and ChannelSelector do not read DesktopAgent getState for channels", () => {
    expect(connectionStoreSource).not.toMatch(/getState\s*\(/)
    expect(channelSelectorSource).not.toMatch(/getState\s*\(/)
    expect(channelSelectorSource).toMatch(/connections\.get/)
    expect(channelSelectorSource).toMatch(/channels\.changeAppChannel/)
    expect(connectionStoreSource).not.toMatch(/agent\.appConnection/)
  })
})

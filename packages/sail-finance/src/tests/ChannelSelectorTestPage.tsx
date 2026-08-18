import { useEffect, useMemo } from "react"
import type { BrowserTypes } from "@finos/fdc3"
import type { SailDesktopAgent } from "@finos/sail-desktop-agent"

import { ChannelSelector } from "../components/ChannelSelector"
import { SailDesktopAgentProvider } from "../contexts"

type Listener = (...args: unknown[]) => void

class TestConnector {
  private listeners = new Map<string, Set<Listener>>()

  on(event: string, handler: Listener): void {
    const handlers = this.listeners.get(event) ?? new Set()
    handlers.add(handler)
    this.listeners.set(event, handlers)
  }

  off(event: string, handler: Listener): void {
    const handlers = this.listeners.get(event)
    if (!handlers) return
    handlers.delete(handler)
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.listeners.get(event)
    if (!handlers) return
    for (const handler of handlers) {
      handler(...args)
    }
  }
}

const TEST_INSTANCE_ID = "playwright-instance"
const TEST_APP_ID = "playwright-app"

export function ChannelSelectorTestPage() {
  const connector = useMemo(() => new TestConnector(), [])

  const channels = useMemo<BrowserTypes.Channel[]>(
    () => [
      {
        id: "fdc3.channel.1",
        type: "user",
        displayMetadata: { name: "Red", color: "#FF0000" },
      },
      {
        id: "fdc3.channel.4",
        type: "user",
        displayMetadata: { name: "Green", color: "#00FF00" },
      },
      {
        id: "fdc3.channel.5",
        type: "user",
        displayMetadata: { name: "Blue", color: "#0000FF" },
      },
    ],
    [],
  )

  const agent = useMemo(() => {
    const appListeners = {
      onConnect: [] as Listener[],
      onDisconnect: [] as Listener[],
    }
    const channelListeners = {
      onAppChannelChange: [] as Listener[],
    }

    return {
      channels: {
        getUserChannels: () => channels,
        changeAppChannel: (instanceId: string, channelId: string | null) => {
          channelListeners.onAppChannelChange.forEach(handler =>
            handler({ instanceId, channelId, channel: null }),
          )
          return Promise.resolve()
        },
        onAppChannelChange: (handler: Listener) => {
          channelListeners.onAppChannelChange.push(handler)
          return () => {
            channelListeners.onAppChannelChange = channelListeners.onAppChannelChange.filter(
              h => h !== handler,
            )
          }
        },
      },
      apps: {
        onConnect: (handler: Listener) => {
          appListeners.onConnect.push(handler)
          return () => {
            appListeners.onConnect = appListeners.onConnect.filter(h => h !== handler)
          }
        },
        onDisconnect: (handler: Listener) => {
          appListeners.onDisconnect.push(handler)
          return () => {
            appListeners.onDisconnect = appListeners.onDisconnect.filter(h => h !== handler)
          }
        },
        onHandshakeFailure: () => () => {},
        getConnection: () => null,
        emitConnect: (metadata: unknown) => {
          appListeners.onConnect.forEach(handler => handler(metadata))
        },
      },
      intentResolver: {
        onRequest: () => () => {},
        select: () => {},
        cancel: () => {},
        getPendingRequests: () => [],
      },
      connector,
    } as unknown as SailDesktopAgent
  }, [channels, connector])

  useEffect(() => {
    const mockAgent = agent as unknown as {
      apps: { emitConnect: (metadata: unknown) => void }
    }
    mockAgent.apps.emitConnect({
      instanceId: TEST_INSTANCE_ID,
      appId: TEST_APP_ID,
      connectedAt: new Date(),
      hostIdentifier: "playwright-panel",
    })
    void agent.channels.changeAppChannel(TEST_INSTANCE_ID, "fdc3.channel.1")
  }, [agent])

  return (
    <SailDesktopAgentProvider agent={agent}>
      <div className="flex min-h-screen items-center justify-center gap-4 bg-gray-50">
        <div className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 text-sm font-medium text-gray-700">Channel Selector Test</div>
          <ChannelSelector instanceId={TEST_INSTANCE_ID} />
        </div>
      </div>
    </SailDesktopAgentProvider>
  )
}

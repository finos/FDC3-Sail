/**
 * Host-facing façade over {@link SailFdc3SessionHandle} for finance UI stores.
 * Replaces the old SailDesktopAgent surface (apps / channels / intentResolver).
 */

import { State, type DirectoryApp } from "@finos/sail-headless-agent"
import type {
  IntentHandler,
  IntentResolutionChoice,
  IntentResolutionRequest,
  IntentResolverUIMethods,
  SailFdc3SessionHandle,
} from "@finos/sail-extension-fdc3"
import { defaultHostWindowRegistry } from "@finos/sail-platform-browser"

export type AppConnectionMetadata = {
  instanceId: string
  appId: string
  source: Window
  hostIdentifier?: string
  connectedAt: Date
}

export type AppChannelChangeEvent = {
  instanceId: string
  channelId: string | null
}

export type HandshakeFailureEvent = {
  error: Error
  connectionAttemptUuid: string
}

export type SailHostAgentApps = {
  open(appId: string): Promise<{ appId: string; instanceId: string }>
  getAll(): DirectoryApp[]
  addDirectory(url: string): Promise<void>
  getConnection(instanceId: string): AppConnectionMetadata | undefined
  disconnect(instanceId: string): void
  onConnect(listener: (metadata: AppConnectionMetadata) => void): () => void
  onDisconnect(listener: (instanceId: string) => void): () => void
  onHandshakeFailure(listener: (event: HandshakeFailureEvent) => void): () => void
}

export type SailHostAgentChannels = {
  changeAppChannel(instanceId: string, channelId: string | null): Promise<void>
  onAppChannelChange(listener: (event: AppChannelChangeEvent) => void): () => void
}

export type SailHostAgent = {
  apps: SailHostAgentApps
  channels: SailHostAgentChannels
  intentResolver: IntentResolverUIMethods
  registerHostWindow(windowRef: Window, instanceId: string): void
  forgetHostWindow(instanceId: string): void
  /** Associate a host panel id with an app before WCP handshake completes. */
  registerPendingHostInstance(args: { appId: string; instanceId: string }): void
  dispose(): void
}

async function fetchDirectoryApps(url: string): Promise<DirectoryApp[]> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`)
  }
  const data: unknown = await res.json()
  const apps = Array.isArray(data)
    ? data
    : (data as { applications?: DirectoryApp[] }).applications
  if (!Array.isArray(apps)) {
    throw new Error(`Invalid AppD at ${url}`)
  }
  return apps as DirectoryApp[]
}

const HOST_APP_SOURCE = "sail-finance:host"

export function createSailHostAgent(handle: SailFdc3SessionHandle): SailHostAgent {
  const connectListeners = new Set<(metadata: AppConnectionMetadata) => void>()
  const disconnectListeners = new Set<(instanceId: string) => void>()
  const channelListeners = new Set<(event: AppChannelChangeEvent) => void>()
  const connections = new Map<string, AppConnectionMetadata>()
  const hostSourceApps = new Map<string, DirectoryApp[]>()

  handle.appContribution.registerSource(HOST_APP_SOURCE, {
    returnApps: () => {
      const byId = new Map<string, DirectoryApp>()
      for (const apps of hostSourceApps.values()) {
        for (const app of apps) {
          byId.set(app.appId, app)
        }
      }
      return [...byId.values()]
    },
  })

  const unsubState = handle.core.onAppStateChange((instanceId, state) => {
    if (state === State.Connected) {
      const details = handle.agent.getInstanceDetails(instanceId)
      const source =
        defaultHostWindowRegistry.getWindowForInstanceId(instanceId) ?? (window as Window)
      const metadata: AppConnectionMetadata = {
        instanceId,
        appId: details?.appId ?? "",
        source,
        hostIdentifier: instanceId,
        connectedAt: new Date(),
      }
      connections.set(instanceId, metadata)
      for (const listener of connectListeners) {
        try {
          listener(metadata)
        } catch {
          // ignore
        }
      }
    } else if (state === State.Terminated) {
      connections.delete(instanceId)
      for (const listener of disconnectListeners) {
        try {
          listener(instanceId)
        } catch {
          // ignore
        }
      }
    }
  })

  const unsubChannel = handle.core.onUserChannelChange(event => {
    for (const listener of channelListeners) {
      try {
        listener(event)
      } catch {
        // ignore
      }
    }
  })

  return {
    apps: {
      async open(appId) {
        const instanceId = await handle.agent.open(appId)
        return { appId, instanceId }
      },
      getAll() {
        return handle.appContribution.retrieveAllApps(handle.sessionId)
      },
      async addDirectory(url) {
        const apps = await fetchDirectoryApps(url)
        hostSourceApps.set(`url:${url}`, apps)
      },
      getConnection(instanceId) {
        return connections.get(instanceId)
      },
      disconnect(instanceId) {
        void handle.agent.close(instanceId)
        connections.delete(instanceId)
        for (const listener of disconnectListeners) {
          try {
            listener(instanceId)
          } catch {
            // ignore
          }
        }
      },
      onConnect(listener) {
        connectListeners.add(listener)
        return () => {
          connectListeners.delete(listener)
        }
      },
      onDisconnect(listener) {
        disconnectListeners.add(listener)
        return () => {
          disconnectListeners.delete(listener)
        }
      },
      onHandshakeFailure() {
        return () => {}
      },
    },
    channels: {
      async changeAppChannel(instanceId, channelId) {
        // Emits via core.onUserChannelChange → channelListeners
        await handle.core.setUserChannel(instanceId, channelId)
      },
      onAppChannelChange(listener) {
        channelListeners.add(listener)
        return () => {
          channelListeners.delete(listener)
        }
      },
    },
    intentResolver: handle.intentResolver,
    registerHostWindow(windowRef, instanceId) {
      defaultHostWindowRegistry.registerHostWindow(windowRef, instanceId)
    },
    forgetHostWindow(instanceId) {
      defaultHostWindowRegistry.unregisterHostWindow(instanceId)
    },
    registerPendingHostInstance({ instanceId }) {
      // Panel id is used as the provisional instance id until WCP adopts it.
      defaultHostWindowRegistry.registerHostWindow(window, instanceId)
    },
    dispose() {
      handle.appContribution.unregisterSource(HOST_APP_SOURCE)
      hostSourceApps.clear()
      unsubChannel()
      unsubState()
      handle.dispose()
    },
  }
}

export type { IntentHandler, IntentResolutionChoice, IntentResolutionRequest }

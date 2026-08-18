import { enableMapSet } from "immer"
import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import type {
  AppChannelChangeEvent,
  AppConnectionMetadata,
  HandshakeFailureEvent,
  SailDesktopAgent,
} from "@finos/sail-desktop-agent"

// Immer draft support for Map/Set in connection state
enableMapSet()

export type ConnectionStatus = "connecting" | "connected" | "disconnected"

export interface Connection {
  instanceId: string
  appId: string
  status: ConnectionStatus
  connectedAt: Date
  panelId?: string // Link to dockview panel
  channelId?: string | null // Current FDC3 user channel (null = no channel)
}

interface ConnectionState {
  connections: Map<string, Connection>
  // Map from panelId to instanceId for quick lookup
  panelToConnection: Map<string, string>
  waitingPanels: Map<string, { panelId: string; appId: string }>
}

/**
 * Window references must not enter Immer/Zustand drafts — Immer traverses objects and
 * triggers cross-origin SecurityError on iframe Window proxies.
 */
const instanceIdBySourceWindow = new WeakMap<Window, string>()

function rememberConnectionSource(source: Window, instanceId: string): void {
  instanceIdBySourceWindow.set(source, instanceId)
}

function escapePanelIdForSelector(panelId: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(panelId)
  }
  return panelId.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function getPanelIframeWindow(panelId: string): Window | null {
  if (typeof document === "undefined") {
    return null
  }
  const iframe = document.querySelector(`iframe[name="${escapePanelIdForSelector(panelId)}"]`)
  return iframe instanceof HTMLIFrameElement ? iframe.contentWindow : null
}

function findWaitingPanelForSource(
  waitingPanels: Map<string, { panelId: string; appId: string }>,
  source: Window,
  appId: string,
): { panelId: string; appId: string } | undefined {
  for (const waiting of waitingPanels.values()) {
    if (waiting.appId !== appId) {
      continue
    }
    if (getPanelIframeWindow(waiting.panelId) === source) {
      return waiting
    }
  }
  return undefined
}

function findUnlinkedConnectionForPanel(
  connections: Map<string, Connection>,
  panelId: string,
): Connection | undefined {
  const iframeWindow = getPanelIframeWindow(panelId)
  if (!iframeWindow) {
    return undefined
  }

  const instanceId = instanceIdBySourceWindow.get(iframeWindow)
  if (!instanceId) {
    return undefined
  }

  const connection = connections.get(instanceId)
  if (!connection || connection.panelId) {
    return undefined
  }

  return connection
}

function linkConnectionToPanel(
  state: ConnectionState,
  connection: Connection,
  panelId: string,
): void {
  connection.panelId = panelId
  state.panelToConnection.set(panelId, connection.instanceId)
  state.waitingPanels.delete(panelId)
}

interface ConnectionActions {
  getConnection: (instanceId: string) => Connection | undefined
  getConnectionByPanelId: (panelId: string) => Connection | undefined
  getAllConnections: () => Connection[]
  registerPanel: (panelId: string, appId: string) => void
  linkPanelToConnection: (panelId: string, instanceId: string) => void
  updateConnectionStatus: (instanceId: string, status: ConnectionStatus) => void
}

export interface ConnectionStore extends ConnectionState, ConnectionActions {}

export const createConnectionStore = (agent: SailDesktopAgent) => {
  const store = create<ConnectionStore>()(
    immer((set, get) => ({
      // Initial state
      connections: new Map(),
      panelToConnection: new Map(),
      // Track panels waiting for connections (for cross-origin iframes where panelId is undefined)
      waitingPanels: new Map<string, { panelId: string; appId: string }>(),

      // Actions
      getConnection: (instanceId: string) => {
        return get().connections.get(instanceId)
      },

      getConnectionByPanelId: (panelId: string) => {
        const instanceId = get().panelToConnection.get(panelId)
        if (!instanceId) return undefined
        return get().connections.get(instanceId)
      },

      getAllConnections: () => {
        return Array.from(get().connections.values())
      },

      registerPanel: (panelId: string, appId: string) =>
        set(state => {
          for (const connection of state.connections.values()) {
            if (connection.panelId === panelId) {
              state.panelToConnection.set(panelId, connection.instanceId)
              state.waitingPanels.delete(panelId)
              return
            }
          }

          const connectionByWindow = findUnlinkedConnectionForPanel(state.connections, panelId)
          if (connectionByWindow) {
            linkConnectionToPanel(state, connectionByWindow, panelId)
            console.log(
              `[ConnectionStore] Panel ${panelId} linked to connection ${connectionByWindow.instanceId} (iframe window match)`,
            )
            return
          }

          state.waitingPanels.set(panelId, { panelId, appId })
        }),

      linkPanelToConnection: (panelId: string, instanceId: string) =>
        set(state => {
          const connection = state.connections.get(instanceId)
          if (connection) {
            connection.panelId = panelId
            state.panelToConnection.set(panelId, instanceId)
          }
        }),

      updateConnectionStatus: (instanceId: string, status: ConnectionStatus) =>
        set(state => {
          const connection = state.connections.get(instanceId)
          if (connection) {
            connection.status = status
          }
        }),
    })),
  )

  const { apps, channels } = agent

  apps.onConnect((metadata: AppConnectionMetadata) => {
    rememberConnectionSource(metadata.source, metadata.instanceId)

    store.setState(state => {
      const connection: Connection = {
        instanceId: metadata.instanceId,
        appId: metadata.appId,
        status: "connected",
        connectedAt: metadata.connectedAt,
        panelId: metadata.hostIdentifier,
      }
      state.connections.set(metadata.instanceId, connection)

      if (metadata.hostIdentifier) {
        state.panelToConnection.set(metadata.hostIdentifier, metadata.instanceId)
        state.waitingPanels.delete(metadata.hostIdentifier)
        return
      }

      if (state.waitingPanels.has(metadata.instanceId)) {
        linkConnectionToPanel(state, connection, metadata.instanceId)
        console.log(
          `[ConnectionStore] Linked connection ${metadata.instanceId} to pre-registered panel`,
        )
        return
      }

      const waitingPanel =
        findWaitingPanelForSource(state.waitingPanels, metadata.source, metadata.appId) ??
        Array.from(state.waitingPanels.values()).find(wp => wp.appId === metadata.appId)

      if (waitingPanel) {
        linkConnectionToPanel(state, connection, waitingPanel.panelId)
        console.log(
          `[ConnectionStore] Linked connection ${metadata.instanceId} to waiting panel ${waitingPanel.panelId}`,
        )
      }
    })
  })

  apps.onDisconnect((instanceId: string) => {
    console.log("[ConnectionStore] App disconnected:", instanceId)
    store.setState(state => {
      const connection = state.connections.get(instanceId)
      if (connection) {
        if (connection.panelId) {
          state.panelToConnection.delete(connection.panelId)
          console.log(`[ConnectionStore] Removed panel mapping for ${connection.panelId}`)
        }
        state.connections.delete(instanceId)
        console.log(`[ConnectionStore] Removed connection for instance ${instanceId}`)
      }
    })
  })

  apps.onHandshakeFailure(({ error, connectionAttemptUuid }: HandshakeFailureEvent) => {
    console.error("[ConnectionStore] Handshake failed:", error, connectionAttemptUuid)
  })

  channels.onAppChannelChange(({ instanceId, channelId }: AppChannelChangeEvent) => {
    console.log("[ConnectionStore] Channel changed:", instanceId, channelId)
    store.setState(state => {
      const connection = state.connections.get(instanceId)
      if (connection) {
        connection.channelId = channelId
      }
    })
  })

  return store
}

import { enableMapSet } from "immer"
import { create } from "zustand"
import { immer } from "zustand/middleware/immer"

// Immer draft support for Map/Set in connection state
enableMapSet()

export type ConnectionStatus = "connecting" | "connected" | "disconnected"

export interface Connection {
  instanceId: string
  appId: string
  status: ConnectionStatus
  connectedAt: Date
  panelId?: string
}

interface ConnectionState {
  connections: Map<string, Connection>
  /** Map from panelId to instanceId for quick lookup */
  panelToConnection: Map<string, string>
}

interface ConnectionActions {
  getConnection: (instanceId: string) => Connection | undefined
  getConnectionByPanelId: (panelId: string) => Connection | undefined
  getAllConnections: () => Connection[]
  registerPanel: (panelId: string, appId: string) => void
  linkPanelToConnection: (panelId: string, instanceId: string) => void
  updateConnectionStatus: (instanceId: string, status: ConnectionStatus) => void
  removePanel: (panelId: string) => void
}

export interface ConnectionStore extends ConnectionState, ConnectionActions {}

/**
 * Panel/connection bookkeeping for the shell.
 * Channel membership and agent handshake live in extensions — the shell only
 * tracks which panel id maps to which app instance for chrome (app bar, close).
 */
export const createConnectionStore = () => {
  return create<ConnectionStore>()(
    immer((set, get) => ({
      connections: new Map(),
      panelToConnection: new Map(),

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
          // Shell launches use panelId as the provisional instance id.
          const instanceId = panelId
          state.panelToConnection.set(panelId, instanceId)
          state.connections.set(instanceId, {
            instanceId,
            appId,
            status: "connected",
            connectedAt: new Date(),
            panelId,
          })
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

      removePanel: (panelId: string) =>
        set(state => {
          const instanceId = state.panelToConnection.get(panelId)
          state.panelToConnection.delete(panelId)
          if (instanceId) {
            state.connections.delete(instanceId)
          }
        }),
    })),
  )
}

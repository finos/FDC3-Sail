import { enableMapSet } from "immer"
import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { persist } from "zustand/middleware"

// Panel interface - represents an FDC3 app instance
export interface Panel {
  panelId: string
  appId: string
  title: string
  url: string
  icon: string | null
}

// Tab interface - represents a collection of panels
export interface Tab {
  tabId: string
  name: string
  panels: Map<string, Panel>
}

// Grid interface - represents the Dockview layout structure
export interface Grid {
  tabs: Map<string, Tab>
  activeTabId: string
  dockviewLayout: unknown // Serialized Dockview state
}

// Workspace interface - represents a complete workspace configuration
export interface Workspace {
  uuid: string
  name: string
  timeLastSaved: number
  layout: Grid
}

interface WorkspaceState {
  workspaces: Map<string, Workspace>
  activeWorkspaceId: string
}

interface WorkspaceActions {
  // Workspace management
  createWorkspace: (name: string) => Workspace
  deleteWorkspace: (workspaceId: string) => void
  setActiveWorkspace: (workspaceId: string) => void
  updateWorkspaceName: (workspaceId: string, name: string) => void
  getWorkspace: (workspaceId: string) => Workspace | undefined
  getAllWorkspaces: () => Workspace[]

  // Tab management
  createTab: (workspaceId: string, name: string) => Tab
  deleteTab: (workspaceId: string, tabId: string) => void
  setActiveTab: (workspaceId: string, tabId: string) => void
  updateTabName: (workspaceId: string, tabId: string, name: string) => void
  getTab: (workspaceId: string, tabId: string) => Tab | undefined
  getTabsForWorkspace: (workspaceId: string) => Tab[]

  // Panel management
  addPanel: (workspaceId: string, tabId: string, panel: Panel) => void
  removePanel: (workspaceId: string, tabId: string, panelId: string) => void
  getPanel: (workspaceId: string, tabId: string, panelId: string) => Panel | undefined
  getPanelsForTab: (workspaceId: string, tabId: string) => Panel[]
  getAllPanelsForWorkspace: (workspaceId: string) => Panel[]

  // Layout management
  setDockviewLayout: (workspaceId: string, layout: unknown) => void
  getDockviewLayout: (workspaceId: string) => unknown

  // Utility methods
  updateWorkspaceTimestamp: (workspaceId: string) => void
}

export interface WorkspaceStore extends WorkspaceState, WorkspaceActions {}

// Helper function to generate UUIDs
const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c == "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Create default empty workspace
const createDefaultWorkspace = (): Workspace => {
  const workspaceId = generateUUID()
  const defaultTabId = generateUUID()

  return {
    uuid: workspaceId,
    name: "Default Workspace",
    timeLastSaved: Date.now(),
    layout: {
      tabs: new Map([
        [
          defaultTabId,
          {
            tabId: defaultTabId,
            name: "Main",
            panels: new Map(), // Start with empty panels - add FDC3 apps from directory
          },
        ],
      ]),
      activeTabId: defaultTabId,
      dockviewLayout: null,
    },
  }
}

// Custom storage implementation to handle Map serialization
const mapStorage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name)
    if (!str) return null
    try {
      const parsed = JSON.parse(str) as { state: { workspaces: Map<string, Workspace> } }
      const deserializedState = {
        ...parsed,
        state: {
          ...parsed.state,
          workspaces: new Map(),
        },
      }

      // Deserialize workspaces
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- localStorage-persisted state: parsed comes from JSON.parse(localStorage.getItem(name)) cast with `as`, which erases the possibility of a stale/malformed schema
      if (parsed.state.workspaces) {
        for (const [workspaceId, workspace] of parsed.state.workspaces) {
          const deserializedWorkspace = {
            ...workspace,
            layout: {
              ...workspace.layout,
              tabs: new Map(),
            },
          }

          // Deserialize tabs
          // oxlint-disable-next-line typescript/no-unnecessary-condition -- localStorage-persisted state: workspace comes from the same cast JSON.parse() result, whose actual persisted shape can predate the current Grid type
          if (workspace.layout.tabs) {
            for (const [tabId, tab] of workspace.layout.tabs) {
              deserializedWorkspace.layout.tabs.set(tabId, {
                ...tab,
                // oxlint-disable-next-line typescript/no-unnecessary-condition -- localStorage-persisted state: tab.panels is JSON-parsed data, not a real Map, and may be absent in an older persisted schema
                panels: new Map(tab.panels || []),
              })
            }
          }

          deserializedState.state.workspaces.set(workspaceId, deserializedWorkspace)
        }
      }

      return deserializedState
    } catch {
      return null
    }
  },
  setItem: (name: string, value: unknown) => {
    // `JSON.stringify` turns a Map into `{}`, which would drop every workspace, tab and
    // panel. Write Maps as entry arrays instead — getItem rebuilds the Maps on the way back.
    localStorage.setItem(
      name,
      JSON.stringify(value, (_key, val: unknown) => (val instanceof Map ? Array.from(val) : val)),
    )
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name)
  },
}

// Enable Map/Set support for Immer
enableMapSet()

export const createWorkspaceStore = () =>
  create<WorkspaceStore>()(
    persist(
      immer<WorkspaceStore>((set, get) => {
        const defaultWorkspace = createDefaultWorkspace()

        return {
          // Initial state
          workspaces: new Map([[defaultWorkspace.uuid, defaultWorkspace]]),
          activeWorkspaceId: defaultWorkspace.uuid,

          // Workspace management
          createWorkspace: (name: string) => {
            const workspace = {
              uuid: generateUUID(),
              name,
              timeLastSaved: Date.now(),
              layout: {
                tabs: new Map(),
                activeTabId: "",
                dockviewLayout: null,
              },
            }

            set(state => {
              state.workspaces.set(workspace.uuid, workspace)
            })

            return workspace
          },

          deleteWorkspace: (workspaceId: string) =>
            set(state => {
              state.workspaces.delete(workspaceId)
              if (state.activeWorkspaceId === workspaceId) {
                const remainingWorkspaces = Array.from(state.workspaces.keys())
                state.activeWorkspaceId = remainingWorkspaces[0] || ""
              }
            }),

          setActiveWorkspace: (workspaceId: string) =>
            set(state => {
              if (state.workspaces.has(workspaceId)) {
                state.activeWorkspaceId = workspaceId
              }
            }),

          updateWorkspaceName: (workspaceId: string, name: string) =>
            set(state => {
              const workspace = state.workspaces.get(workspaceId)
              if (workspace) {
                workspace.name = name
                workspace.timeLastSaved = Date.now()
              }
            }),

          getWorkspace: (workspaceId: string) => {
            return get().workspaces.get(workspaceId)
          },

          getAllWorkspaces: () => {
            return Array.from(get().workspaces.values())
          },

          // Tab management
          createTab: (workspaceId: string, name: string) => {
            const tab = {
              tabId: generateUUID(),
              name,
              panels: new Map<string, Panel>(),
            }

            set(state => {
              const workspace = state.workspaces.get(workspaceId)
              if (workspace) {
                workspace.layout.tabs.set(tab.tabId, tab)
                if (!workspace.layout.activeTabId) {
                  workspace.layout.activeTabId = tab.tabId
                }
                workspace.timeLastSaved = Date.now()
              }
            })

            return tab
          },

          deleteTab: (workspaceId: string, tabId: string) =>
            set(state => {
              const workspace = state.workspaces.get(workspaceId)
              if (workspace) {
                workspace.layout.tabs.delete(tabId)
                if (workspace.layout.activeTabId === tabId) {
                  const remainingTabs = Array.from(workspace.layout.tabs.keys())
                  workspace.layout.activeTabId = remainingTabs[0] || ""
                }
                workspace.timeLastSaved = Date.now()
              }
            }),

          setActiveTab: (workspaceId: string, tabId: string) =>
            set(state => {
              const workspace = state.workspaces.get(workspaceId)
              if (workspace && workspace.layout.tabs.has(tabId)) {
                workspace.layout.activeTabId = tabId
              }
            }),

          updateTabName: (workspaceId: string, tabId: string, name: string) =>
            set(state => {
              const workspace = state.workspaces.get(workspaceId)
              if (workspace) {
                const tab = workspace.layout.tabs.get(tabId)
                if (tab) {
                  tab.name = name
                  workspace.timeLastSaved = Date.now()
                }
              }
            }),

          getTab: (workspaceId: string, tabId: string) => {
            const workspace = get().workspaces.get(workspaceId)
            return workspace?.layout.tabs.get(tabId)
          },

          getTabsForWorkspace: (workspaceId: string) => {
            const workspace = get().workspaces.get(workspaceId)
            return workspace ? Array.from(workspace.layout.tabs.values()) : []
          },

          // Panel management
          addPanel: (workspaceId: string, tabId: string, panel: Panel) =>
            set(state => {
              const workspace = state.workspaces.get(workspaceId)
              if (workspace) {
                const tab = workspace.layout.tabs.get(tabId)
                if (tab) {
                  tab.panels.set(panel.panelId, panel)
                  workspace.timeLastSaved = Date.now()
                }
              }
            }),

          removePanel: (workspaceId: string, tabId: string, panelId: string) =>
            set(state => {
              const workspace = state.workspaces.get(workspaceId)
              if (workspace) {
                const tab = workspace.layout.tabs.get(tabId)
                if (tab) {
                  tab.panels.delete(panelId)
                  workspace.timeLastSaved = Date.now()
                }
              }
            }),

          getPanel: (workspaceId: string, tabId: string, panelId: string) => {
            const workspace = get().workspaces.get(workspaceId)
            return workspace?.layout.tabs.get(tabId)?.panels.get(panelId)
          },

          getPanelsForTab: (workspaceId: string, tabId: string) => {
            const workspace = get().workspaces.get(workspaceId)
            const tab = workspace?.layout.tabs.get(tabId)
            return tab ? Array.from(tab.panels.values()) : []
          },

          getAllPanelsForWorkspace: (workspaceId: string) => {
            const workspace = get().workspaces.get(workspaceId)
            if (!workspace) return []

            const allPanels: Panel[] = []
            const tabs = Array.from(workspace.layout.tabs.values())
            for (const tab of tabs) {
              allPanels.push(...Array.from(tab.panels.values()))
            }
            return allPanels
          },

          // Layout management
          setDockviewLayout: (workspaceId: string, layout: unknown) =>
            set(state => {
              const workspace = state.workspaces.get(workspaceId)
              if (workspace) {
                workspace.layout.dockviewLayout = layout
                workspace.timeLastSaved = Date.now()
              }
            }),

          getDockviewLayout: (workspaceId: string) => {
            const workspace = get().workspaces.get(workspaceId)
            return workspace?.layout.dockviewLayout || null
          },

          // Utility methods
          updateWorkspaceTimestamp: (workspaceId: string) =>
            set(state => {
              const workspace = state.workspaces.get(workspaceId)
              if (workspace) {
                workspace.timeLastSaved = Date.now()
              }
            }),
        }
      }),
      {
        name: "workspace-store",
        storage: mapStorage,
      },
    ),
  )

export const useWorkspaceStore = createWorkspaceStore()

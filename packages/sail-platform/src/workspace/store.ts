import { createLocalStorage } from "../storage/local"
import type { SailStorage } from "../storage/types"
import type { Geometry, Layout, Panel, Rect, Tab, Workspace, WorkspaceSummary } from "./types"

/** Snapshot handed to the UI. Replaced wholesale on every mutation. */
export interface WorkspaceState {
  /** The workspace currently loaded, or `null` before `create()` or `load()`. */
  workspace: Workspace | null

  /** Everything in storage, as of the last `refresh()`, newest save first. */
  saved: WorkspaceSummary[]
}

export interface WorkspaceStoreOptions {
  /**
   * Where workspaces are persisted.
   * @defaultValue `createLocalStorage()`
   */
  storage?: SailStorage

  /**
   * Key namespace for workspaces inside {@link WorkspaceStoreOptions.storage}.
   * @defaultValue "workspace:"
   */
  keyPrefix?: string

  /**
   * ID factory for workspaces, tabs and panels.
   * @defaultValue `crypto.randomUUID`
   */
  createId?: () => string

  /**
   * Clock used to stamp `savedAt`.
   * @defaultValue `Date.now`
   */
  now?: () => number
}

export interface CreateWorkspaceOptions {
  /** @defaultValue `{ mode: "rects" }` */
  geometry?: Geometry
  /** @defaultValue a single tab named "Main" */
  tabs?: Tab[]
}

/** A panel to add. `id` is generated when omitted. */
export type PanelInput = Omit<Panel, "id"> & { id?: string }

/**
 * Framework-agnostic store for workspaces and layouts.
 *
 * `subscribe` + `getSnapshot` are shaped for React's `useSyncExternalStore`, but
 * nothing here is React-specific — any UI can bind to it.
 *
 * Mutations are synchronous and in-memory; persistence is explicit via `save()`.
 * A host is free to render every keystroke and save on a debounce.
 */
export interface WorkspaceStore {
  getSnapshot(): WorkspaceState
  subscribe(listener: () => void): () => void

  // ----- workspace lifecycle -----

  /** Create a workspace and make it active. Not persisted until `save()`. */
  create(name: string, options?: CreateWorkspaceOptions): Workspace
  /** Rename the active workspace. */
  rename(name: string): void
  /** Reload the saved-workspace summaries from storage. */
  refresh(): Promise<void>
  /** Load a saved workspace and make it active. */
  load(id: string): Promise<void>
  /** Persist the active workspace and stamp `savedAt`. */
  save(): Promise<void>
  /** Delete a saved workspace. Clears the active one if it is the same. */
  remove(id: string): Promise<void>

  // ----- tabs -----

  addTab(name: string, options?: Pick<Tab, "icon" | "background">): Tab
  removeTab(tabId: string): void
  renameTab(tabId: string, name: string): void
  activateTab(tabId: string): void

  // ----- panels -----

  addPanel(tabId: string, panel: PanelInput): Panel
  removePanel(panelId: string): void
  movePanel(panelId: string, toTabId: string): void

  // ----- geometry -----

  /** Store opaque layout-library state, switching the layout to the `renderer` lane. */
  setRendererState(state: unknown): void
  /** Set a panel's coordinates. Throws if the layout is in the `renderer` lane. */
  setPanelRect(panelId: string, rect: Rect): void
}

export function createWorkspaceStore(options?: WorkspaceStoreOptions): WorkspaceStore {
  const storage = options?.storage ?? createLocalStorage()
  const keyPrefix = options?.keyPrefix ?? "workspace:"
  const createId = options?.createId ?? ((): string => crypto.randomUUID())
  const now = options?.now ?? ((): number => Date.now())

  let state: WorkspaceState = { workspace: null, saved: [] }
  const listeners = new Set<() => void>()

  const setState = (next: WorkspaceState): void => {
    state = next
    for (const listener of listeners) {
      listener()
    }
  }

  const active = (): Workspace => {
    if (state.workspace === null) {
      throw new Error("No workspace loaded — call create() or load() first.")
    }
    return state.workspace
  }

  const putWorkspace = (workspace: Workspace): void => {
    setState({ ...state, workspace })
  }

  const putLayout = (layout: Layout): void => {
    putWorkspace({ ...active(), layout })
  }

  const putTabs = (tabs: Tab[]): void => {
    putLayout({ ...active().layout, tabs })
  }

  const mapPanels = (fn: (panels: Panel[]) => Panel[]): void => {
    putTabs(active().layout.tabs.map(tab => ({ ...tab, panels: fn(tab.panels) })))
  }

  const requireTab = (tabId: string): Tab => {
    const tab = active().layout.tabs.find(candidate => candidate.id === tabId)
    if (tab === undefined) {
      throw new Error(`Tab "${tabId}" not found in the active workspace.`)
    }
    return tab
  }

  const storageKey = (id: string): string => `${keyPrefix}${id}`

  const summarise = ({ id, name, savedAt }: Workspace): WorkspaceSummary => ({ id, name, savedAt })

  const byNewest = (a: WorkspaceSummary, b: WorkspaceSummary): number => b.savedAt - a.savedAt

  return {
    getSnapshot: () => state,

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    // ----- workspace lifecycle -----

    create(name, createOptions) {
      const tabs = createOptions?.tabs ?? [{ id: createId(), name: "Main", panels: [] }]
      const workspace: Workspace = {
        id: createId(),
        name,
        savedAt: 0,
        layout: {
          tabs,
          activeTabId: tabs[0]?.id ?? "",
          geometry: createOptions?.geometry ?? { mode: "rects" },
        },
      }
      putWorkspace(workspace)
      return workspace
    },

    rename(name) {
      putWorkspace({ ...active(), name })
    },

    async refresh() {
      const keys = await storage.list(keyPrefix)
      const loaded = await Promise.all(keys.map(key => storage.get<Workspace>(key)))
      const saved = loaded
        .filter((workspace): workspace is Workspace => workspace !== null)
        .map(summarise)
        .sort(byNewest)

      setState({ ...state, saved })
    },

    async load(id) {
      const workspace = await storage.get<Workspace>(storageKey(id))
      if (workspace === null) {
        throw new Error(`Workspace "${id}" not found in storage.`)
      }
      setState({ ...state, workspace })
    },

    async save() {
      const workspace: Workspace = { ...active(), savedAt: now() }
      await storage.set(storageKey(workspace.id), workspace)

      const summary = summarise(workspace)
      const saved = [...state.saved.filter(entry => entry.id !== workspace.id), summary].sort(
        byNewest,
      )

      setState({ ...state, workspace, saved })
    },

    async remove(id) {
      await storage.remove(storageKey(id))
      setState({
        ...state,
        workspace: state.workspace?.id === id ? null : state.workspace,
        saved: state.saved.filter(entry => entry.id !== id),
      })
    },

    // ----- tabs -----

    addTab(name, tabOptions) {
      const tab: Tab = {
        id: createId(),
        name,
        icon: tabOptions?.icon,
        background: tabOptions?.background,
        panels: [],
      }
      putTabs([...active().layout.tabs, tab])
      return tab
    },

    removeTab(tabId) {
      const { layout } = active()
      const tabs = layout.tabs.filter(tab => tab.id !== tabId)
      putLayout({
        ...layout,
        tabs,
        activeTabId: layout.activeTabId === tabId ? (tabs[0]?.id ?? "") : layout.activeTabId,
      })
    },

    renameTab(tabId, name) {
      requireTab(tabId)
      putTabs(active().layout.tabs.map(tab => (tab.id === tabId ? { ...tab, name } : tab)))
    },

    activateTab(tabId) {
      requireTab(tabId)
      putLayout({ ...active().layout, activeTabId: tabId })
    },

    // ----- panels -----

    addPanel(tabId, panel) {
      requireTab(tabId)
      const created: Panel = { ...panel, id: panel.id ?? createId() }
      putTabs(
        active().layout.tabs.map(tab =>
          tab.id === tabId ? { ...tab, panels: [...tab.panels, created] } : tab,
        ),
      )
      return created
    },

    removePanel(panelId) {
      mapPanels(panels => panels.filter(panel => panel.id !== panelId))
    },

    movePanel(panelId, toTabId) {
      requireTab(toTabId)
      const { layout } = active()
      const panel = layout.tabs.flatMap(tab => tab.panels).find(entry => entry.id === panelId)
      if (panel === undefined) {
        throw new Error(`Panel "${panelId}" not found in the active workspace.`)
      }

      putTabs(
        layout.tabs.map(tab => {
          const panels = tab.panels.filter(entry => entry.id !== panelId)
          return tab.id === toTabId ? { ...tab, panels: [...panels, panel] } : { ...tab, panels }
        }),
      )
    },

    // ----- geometry -----

    setRendererState(rendererState) {
      putLayout({ ...active().layout, geometry: { mode: "renderer", state: rendererState } })
    },

    setPanelRect(panelId, rect) {
      if (active().layout.geometry.mode === "renderer") {
        throw new Error(
          "Cannot set a panel rect: this layout's arrangement is owned by a renderer. " +
            "A layout uses either renderer state or rects, never both.",
        )
      }
      mapPanels(panels => panels.map(panel => (panel.id === panelId ? { ...panel, rect } : panel)))
    },
  }
}

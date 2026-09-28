import { DockviewReact, type DockviewReadyEvent, DockviewApi } from "dockview-react"
import { useState, useEffect, useRef, useMemo } from "react"

import "./styles.css"
import { useWorkspaceStore } from "../../stores/workspace-store"
import { useConnectionStore, useSailDesktopAgent } from "../../contexts"

import type { FDC3AppPanel } from "./panel-templates/FDC3IframePanel"
import { FDC3_PANEL_RENDERER, isFdc3PanelParams } from "./dockview-options"
import { LeftControls, PrefixToolbarControls, RightControls } from "./toolbar/controls/index"
import { Panels } from "./Panels"
import type { DockviewSailProps } from "./types"
import { WatermarkPanel } from "./panel-templates/WatermarkPanel"
import { FDC3Tab } from "./tab-templates/FDC3Tab"
import { dockviewPopoutUrl } from "../../utils/dockview-popout"

// Custom tab components for rendering tabs with icons
const TabComponents = {
  fdc3Tab: FDC3Tab,
}

// Re-export types for backward compatibility
export type { DockviewSailProps } from "./types"
export type { Panel as WorkspacePanel } from "../../stores/workspace-store"

const Layout = (props: DockviewSailProps) => {
  const api = useRef<DockviewApi | undefined>(undefined)
  const [mountedPanels, setMountedPanels] = useState<Map<string, FDC3AppPanel>>(new Map())
  const [restoredWorkspaceId, setRestoredWorkspaceId] = useState<string | null>(null)
  const [apiReady, setApiReady] = useState(false)
  const isRestoringRef = useRef(false)

  // Use Zustand workspace store
  const {
    workspaces,
    activeWorkspaceId,
    addPanel,
    removePanel,
    getPanelsForTab,
    setDockviewLayout,
    getDockviewLayout,
  } = useWorkspaceStore()

  // Get desktop agent and connection store for instance cleanup
  const agent = useSailDesktopAgent()
  const connectionStore = useConnectionStore()

  const activeWorkspace = workspaces.get(activeWorkspaceId)
  const activeTabId = activeWorkspace?.layout.activeTabId || ""
  const panels = useMemo(
    () => (activeWorkspace ? getPanelsForTab(activeWorkspaceId, activeTabId) : []),
    [activeWorkspace, activeWorkspaceId, activeTabId, getPanelsForTab],
  )

  const onReady = (event: DockviewReadyEvent) => {
    api.current = event.api
    setApiReady(true)
    // A fresh Dockview instance holds no panels, so the saved layout must be replayed into
    // it and panel tracking must start over.
    setRestoredWorkspaceId(null)
    // Same reference when already empty so React can bail out of the re-render.
    setMountedPanels(prev => (prev.size === 0 ? prev : new Map<string, FDC3AppPanel>()))
  }

  // Reset restoration tracking when workspace changes
  useEffect(() => {
    setRestoredWorkspaceId(null)
  }, [activeWorkspaceId])

  // Layout restoration - only run once per workspace when API is ready
  useEffect(() => {
    if (!apiReady || !api.current || !activeWorkspaceId) {
      return
    }

    // Only restore once per workspace ID
    if (restoredWorkspaceId === activeWorkspaceId) {
      return
    }

    const savedLayoutState = getDockviewLayout(activeWorkspaceId)

    // Validate that we have a non-empty, valid layout
    // Empty layouts like {}, null, or objects without proper structure should be skipped
    if (
      !savedLayoutState ||
      typeof savedLayoutState !== "object" || // oxlint-disable-line typescript/no-unnecessary-condition -- localStorage-persisted state: savedLayoutState is read back from the workspace store's persisted layout, whose actual shape can predate the current type
      savedLayoutState === null ||
      // Check if it has at least some structure (not just empty object)
      Object.keys(savedLayoutState).length === 0
    ) {
      // No valid layout to restore, mark as restored to prevent re-checking
      setRestoredWorkspaceId(activeWorkspaceId)
      return
    }

    try {
      console.log("Restoring layout state from workspace store")
      // Prevent saveState from running during restoration
      isRestoringRef.current = true
      setRestoredWorkspaceId(activeWorkspaceId)

      // The layout state comes from Dockview's toJSON() which returns SerializedDockview
      // We store it as any in the store, so we need to cast it back
      api.current.fromJSON(savedLayoutState as Parameters<typeof api.current.fromJSON>[0])

      api.current.panels.forEach(panel => {
        if (isFdc3PanelParams(panel.params)) {
          panel.api.setRenderer(FDC3_PANEL_RENDERER)
        }
      })

      // Use setTimeout to allow layout change events to settle before re-enabling saves
      setTimeout(() => {
        isRestoringRef.current = false
      }, 200)

      console.log("Layout state restored successfully")
    } catch (error) {
      console.warn("Failed to restore layout state:", error)
      isRestoringRef.current = false
      setDockviewLayout(activeWorkspaceId, null)
      setRestoredWorkspaceId(activeWorkspaceId)
    }
  }, [apiReady, activeWorkspaceId, restoredWorkspaceId, getDockviewLayout, setDockviewLayout])

  // Event listeners and state saving - separate from restoration
  useEffect(() => {
    if (!api.current) {
      return
    }

    const saveState = () => {
      // Don't save during restoration to prevent loops
      if (isRestoringRef.current) {
        return
      }

      if (api.current && activeWorkspaceId) {
        try {
          const state = api.current.toJSON()
          // Only save if there are actually panels, avoid saving empty layouts
          // oxlint-disable-next-line typescript/no-unnecessary-condition -- dockview third-party return type
          if (state && api.current.panels.length > 0) {
            setDockviewLayout(activeWorkspaceId, state)
          } else {
            // Clear empty layout from store
            setDockviewLayout(activeWorkspaceId, null)
          }
        } catch (error) {
          console.warn("Failed to save layout state:", error)
        }
      }
    }

    const disposables = [
      api.current.onDidAddPanel(event => {
        // If this panel was added externally, notify the store
        const panel = mountedPanels.get(event.id)
        if (panel && activeWorkspaceId && activeTabId) {
          // Convert FDC3AppPanel to Panel and add to store
          const workspacePanel = {
            panelId: panel.panelId,
            appId: panel.appId,
            title: panel.title,
            url: panel.url,
            icon: panel.icon,
          }
          addPanel(activeWorkspaceId, activeTabId, workspacePanel)
        }
        // Save state after adding panel
        saveState()
      }),
      api.current.onDidRemovePanel(event => {
        // Clean up desktop agent registration and send WCP6Goodbye
        const panelId = event.id
        console.log(`[Layout] Panel removed: ${panelId}`)

        const connection = connectionStore.getConnectionByPanelId(panelId)
        console.log(`[Layout] Connection lookup for panel ${panelId}:`, {
          found: !!connection,
          instanceId: connection?.instanceId,
          status: connection?.status,
        })

        // Prefer WCP5 validated id when linked; otherwise panelId is the host PENDING id.
        const instanceId = connection?.instanceId ?? panelId
        console.log(`[Layout] Disconnecting instance ${instanceId} for panel ${panelId}`, {
          hadConnection: !!connection,
        })
        try {
          agent.apps.disconnect(instanceId)
        } catch (error) {
          console.error(`[Layout] Error disconnecting instance ${instanceId}:`, error)
        }

        // Remove from store
        if (activeWorkspaceId && activeTabId) {
          console.log(
            `[Layout] Removing panel ${panelId} from store (workspace: ${activeWorkspaceId}, tab: ${activeTabId})`,
          )
          removePanel(activeWorkspaceId, activeTabId, panelId)
        } else {
          console.warn(
            `[Layout] Cannot remove panel from store: activeWorkspaceId=${activeWorkspaceId}, activeTabId=${activeTabId}`,
          )
        }
        // Save state after removing panel
        saveState()
      }),
      // Save state on layout changes
      api.current.onDidLayoutChange(() => {
        saveState()
      }),
    ]

    return () => disposables.forEach(disposable => disposable.dispose())
  }, [
    mountedPanels,
    activeTabId,
    addPanel,
    removePanel,
    setDockviewLayout,
    activeWorkspaceId,
    connectionStore,
    agent,
  ])

  // Sync with store panels when they change
  useEffect(() => {
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- localStorage-persisted state; panels derives from JSON-parsed workspace data
    if (!api.current || !panels || !activeTabId || !activeWorkspaceId) return

    // Wait for the saved layout to be replayed. Adding panels first puts them in one default
    // group and the resulting onDidAddPanel -> saveState overwrites the layout being restored.
    if (restoredWorkspaceId !== activeWorkspaceId) return

    const currentPanelIds = Array.from(mountedPanels.keys())
    const externalPanelIds = panels.map(p => p.panelId)

    // Get all existing panels from Dockview to check current state
    const existingDockviewPanels = api.current.panels.map(p => p.id)
    console.log("[Layout Sync Check]", {
      storePanels: externalPanelIds,
      mountedPanels: currentPanelIds,
      dockviewPanels: existingDockviewPanels,
      storeCount: externalPanelIds.length,
      mountedCount: currentPanelIds.length,
      dockviewCount: existingDockviewPanels.length,
    })

    // Remove panels that no longer exist in the store but exist in mounted/dockview
    currentPanelIds
      .filter(id => !externalPanelIds.includes(id))
      .forEach(id => {
        const panel = api.current?.getPanel(id)
        if (panel) {
          console.log(`Removing panel ${id} as it's no longer in store`)
          api.current?.removePanel(panel)
        }
        setMountedPanels(prev => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
      })

    // Add new panels from store that don't exist in Dockview
    panels
      .filter(panel => !currentPanelIds.includes(panel.panelId))
      .forEach(panel => {
        // Double-check that the panel doesn't already exist in Dockview
        if (!api.current?.getPanel(panel.panelId)) {
          console.log(`Creating new panel ${panel.panelId}`)
          const fdc3Panel: FDC3AppPanel = {
            title: panel.title,
            url: panel.url,
            tabId: activeTabId, // Use the active tab ID
            panelId: panel.panelId,
            appId: panel.appId,
            icon: panel.icon,
          }

          api.current?.addPanel({
            id: panel.panelId,
            component: "fdc3",
            tabComponent: "fdc3Tab",
            title: panel.title,
            params: { panel: fdc3Panel },
            renderer: FDC3_PANEL_RENDERER,
          })

          setMountedPanels(prev => new Map(prev).set(panel.panelId, fdc3Panel))
        } else {
          console.warn(
            `Panel ${panel.panelId} already exists in Dockview, updating mounted panels tracking`,
          )
          // If panel exists in Dockview but not in mountedPanels, add it to tracking
          const fdc3Panel: FDC3AppPanel = {
            title: panel.title,
            url: panel.url,
            tabId: activeTabId, // Use the active tab ID
            panelId: panel.panelId,
            appId: panel.appId,
            icon: panel.icon,
          }
          setMountedPanels(prev => new Map(prev).set(panel.panelId, fdc3Panel))
        }
      })
  }, [panels, activeTabId, mountedPanels, activeWorkspaceId, restoredWorkspaceId])

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        flex: 1,
      }}
    >
      <DockviewReact
        components={Panels}
        tabComponents={TabComponents}
        rightHeaderActionsComponent={RightControls}
        leftHeaderActionsComponent={LeftControls}
        prefixHeaderActionsComponent={PrefixToolbarControls}
        defaultRenderer={FDC3_PANEL_RENDERER}
        popoutUrl={dockviewPopoutUrl()}
        onReady={onReady}
        className={props.theme || "dockview-theme-abyss"}
        watermarkComponent={WatermarkPanel}
      />
    </div>
  )
}

export default Layout

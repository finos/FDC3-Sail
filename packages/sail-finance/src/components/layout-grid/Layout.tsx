import { DockviewReact, type DockviewReadyEvent, DockviewApi } from "dockview-react"
import { useState, useEffect, useRef, useMemo } from "react"

import "./styles.css"
import { useWorkspaceStore } from "../../stores/workspace-store"
import { useConnectionStore, useSailSession } from "../../contexts"

import type { AppPanel } from "./panel-templates/AppIframePanel"
import { APP_PANEL_RENDERER, isAppPanelParams } from "./dockview-options"
import { LeftControls, PrefixToolbarControls, RightControls } from "./toolbar/controls/index"
import { Panels } from "./Panels"
import type { DockviewSailProps } from "./types"
import { WatermarkPanel } from "./panel-templates/WatermarkPanel"
import { AppTab } from "./tab-templates/AppTab"
import { dockviewPopoutUrl } from "../../utils/dockview-popout"

const TabComponents = {
  appTab: AppTab,
}

export type { DockviewSailProps } from "./types"
export type { Panel as WorkspacePanel } from "../../stores/workspace-store"

const Layout = (props: DockviewSailProps) => {
  const api = useRef<DockviewApi | undefined>(undefined)
  const [mountedPanels, setMountedPanels] = useState<Map<string, AppPanel>>(new Map())
  const [restoredWorkspaceId, setRestoredWorkspaceId] = useState<string | null>(null)
  const [apiReady, setApiReady] = useState(false)
  const isRestoringRef = useRef(false)

  const {
    workspaces,
    activeWorkspaceId,
    addPanel,
    getPanelsForTab,
    setDockviewLayout,
    getDockviewLayout,
  } = useWorkspaceStore()

  const session = useSailSession()
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
    setRestoredWorkspaceId(null)
    setMountedPanels(prev => (prev.size === 0 ? prev : new Map<string, AppPanel>()))
  }

  useEffect(() => {
    setRestoredWorkspaceId(null)
  }, [activeWorkspaceId])

  useEffect(() => {
    if (!apiReady || !api.current || !activeWorkspaceId) {
      return
    }

    if (restoredWorkspaceId === activeWorkspaceId) {
      return
    }

    const savedLayoutState = getDockviewLayout(activeWorkspaceId)

    if (
      !savedLayoutState ||
      typeof savedLayoutState !== "object" || // oxlint-disable-line typescript/no-unnecessary-condition -- localStorage-persisted state
      Object.keys(savedLayoutState).length === 0
    ) {
      setRestoredWorkspaceId(activeWorkspaceId)
      return
    }

    try {
      console.log("Restoring layout state from workspace store")
      isRestoringRef.current = true
      setRestoredWorkspaceId(activeWorkspaceId)

      api.current.fromJSON(savedLayoutState as Parameters<typeof api.current.fromJSON>[0])

      api.current.panels.forEach(panel => {
        if (isAppPanelParams(panel.params)) {
          panel.api.setRenderer(APP_PANEL_RENDERER)
        }
      })

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

  useEffect(() => {
    if (!api.current) {
      return
    }

    const saveState = () => {
      if (isRestoringRef.current) {
        return
      }

      if (api.current && activeWorkspaceId) {
        try {
          const state = api.current.toJSON()
          // oxlint-disable-next-line typescript/no-unnecessary-condition -- dockview third-party return type
          if (state && api.current.panels.length > 0) {
            setDockviewLayout(activeWorkspaceId, state)
          } else {
            setDockviewLayout(activeWorkspaceId, null)
          }
        } catch (error) {
          console.warn("Failed to save layout state:", error)
        }
      }
    }

    const disposables = [
      api.current.onDidAddPanel(event => {
        const panel = mountedPanels.get(event.id)
        if (panel && activeWorkspaceId && activeTabId) {
          const workspacePanel = {
            panelId: panel.panelId,
            appId: panel.appId,
            title: panel.title,
            url: panel.url,
            icon: panel.icon,
          }
          addPanel(activeWorkspaceId, activeTabId, workspacePanel)
        }
        saveState()
      }),
      api.current.onDidRemovePanel(event => {
        const panelId = event.id
        console.log(`[Layout] Panel removed: ${panelId}`)

        const connection = connectionStore.getConnectionByPanelId(panelId)
        const instanceId = connection?.instanceId ?? panelId
        console.log(`[Layout] Closing session app ${instanceId} for panel ${panelId}`, {
          hadConnection: !!connection,
        })
        try {
          // Session closeApp removes the workspace-store panel.
          void session.closeApp(instanceId)
          connectionStore.removePanel(panelId)
        } catch (error) {
          console.error(`[Layout] Error closing instance ${instanceId}:`, error)
        }
        saveState()
      }),
      api.current.onDidLayoutChange(() => {
        saveState()
      }),
    ]

    return () => disposables.forEach(disposable => disposable.dispose())
  }, [
    mountedPanels,
    activeTabId,
    addPanel,
    setDockviewLayout,
    activeWorkspaceId,
    connectionStore,
    session,
  ])

  useEffect(() => {
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- localStorage-persisted state
    if (!api.current || !panels || !activeTabId || !activeWorkspaceId) return

    if (restoredWorkspaceId !== activeWorkspaceId) return

    const currentPanelIds = Array.from(mountedPanels.keys())
    const externalPanelIds = panels.map(p => p.panelId)

    const existingDockviewPanels = api.current.panels.map(p => p.id)
    console.log("[Layout Sync Check]", {
      storePanels: externalPanelIds,
      mountedPanels: currentPanelIds,
      dockviewPanels: existingDockviewPanels,
      storeCount: externalPanelIds.length,
      mountedCount: currentPanelIds.length,
      dockviewCount: existingDockviewPanels.length,
    })

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

    panels
      .filter(panel => !currentPanelIds.includes(panel.panelId))
      .forEach(panel => {
        if (!api.current?.getPanel(panel.panelId)) {
          console.log(`Creating new panel ${panel.panelId}`)
          const appPanel: AppPanel = {
            title: panel.title,
            url: panel.url,
            tabId: activeTabId,
            panelId: panel.panelId,
            appId: panel.appId,
            icon: panel.icon,
          }

          api.current?.addPanel({
            id: panel.panelId,
            component: "app",
            tabComponent: "appTab",
            title: panel.title,
            params: { panel: appPanel },
            renderer: APP_PANEL_RENDERER,
          })

          setMountedPanels(prev => new Map(prev).set(panel.panelId, appPanel))
        } else {
          console.warn(
            `Panel ${panel.panelId} already exists in Dockview, updating mounted panels tracking`,
          )
          const appPanel: AppPanel = {
            title: panel.title,
            url: panel.url,
            tabId: activeTabId,
            panelId: panel.panelId,
            appId: panel.appId,
            icon: panel.icon,
          }
          setMountedPanels(prev => new Map(prev).set(panel.panelId, appPanel))
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
        defaultRenderer={APP_PANEL_RENDERER}
        popoutUrl={dockviewPopoutUrl()}
        onReady={onReady}
        className={props.theme || "dockview-theme-abyss"}
        watermarkComponent={WatermarkPanel}
      />
    </div>
  )
}

export default Layout

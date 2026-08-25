import { X } from "lucide-react"
import { useLayoutEffect, useRef, type MutableRefObject } from "react"
import { GridStack, type GridItemHTMLElement } from "gridstack"
import "gridstack/dist/gridstack.css"
import styles from "./styles.module.css"
import {
  AppInstanceState,
  type AppPanel,
  type ClientState,
  getAppState,
  getServerState,
} from "../state"
import { findEmptyArea } from "./find-empty-area"
import { setupTabDropTargets } from "./setup-tab-drop-targets"

type GridsProps = {
  cs: ClientState
  onOpenApp: () => void
}

const gridOptions = {
  auto: false,
  acceptWidgets: true,
  margin: 4,
  cellHeight: "70px",
  resizable: {
    handles: "e, se, s, sw, w",
  },
} as const

export function Grids({ cs, onOpenApp }: GridsProps) {
  const activeTabId = cs.getActiveTab().id
  const tabIds = cs
    .getTabs()
    .map(t => t.id)
    .join(",")
  const dropTargetTabId = useRef<string | null>(null)
  const gridByTabId = useRef<Map<string, GridStack>>(new Map())
  const activePanels = cs.getPanels().filter(p => p.tabId === activeTabId)
  const showEmptyState = activePanels.length === 0

  useLayoutEffect(() => {
    return setupTabDropTargets(tabId => {
      dropTargetTabId.current = tabId
    })
  }, [tabIds])

  return (
    <div className={styles.grids}>
      {showEmptyState ? (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>No apps open</h2>
          <p className={styles.emptyCopy}>
            Open an app from the directory to start working in this channel.
          </p>
          <button type="button" className={styles.emptyButton} onClick={onOpenApp}>
            Apps
          </button>
        </div>
      ) : null}
      {cs.getTabs().map(tab => (
        <TabGrid
          key={tab.id}
          tabId={tab.id}
          visible={tab.id === activeTabId}
          panels={cs.getPanels().filter(p => p.tabId === tab.id)}
          cs={cs}
          dropTargetTabId={dropTargetTabId}
          gridByTabId={gridByTabId}
        />
      ))}
    </div>
  )
}

function TabGrid({
  tabId,
  visible,
  panels,
  cs,
  dropTargetTabId,
  gridByTabId,
}: {
  tabId: string
  visible: boolean
  panels: AppPanel[]
  cs: ClientState
  dropTargetTabId: MutableRefObject<string | null>
  gridByTabId: MutableRefObject<Map<string, GridStack>>
}) {
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<GridStack | null>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useLayoutEffect(() => {
    const container = gridContainerRef.current
    if (!container || gridRef.current) {
      return
    }

    const grid = GridStack.init({ ...gridOptions }, container)
    gridRef.current = grid
    gridByTabId.current.set(tabId, grid)

    const persistPanelGeometry = (element: GridItemHTMLElement) => {
      const node = element.gridstackNode
      if (!node?.id) {
        return
      }
      const panel = cs.getPanels().find(p => p.panelId === node.id)
      if (!panel) {
        return
      }
      void cs.updatePanel({
        ...panel,
        x: node.x ?? panel.x,
        y: node.y ?? panel.y,
        w: node.w ?? panel.w,
        h: node.h ?? panel.h,
      })
    }

    const movePanelToTab = (element: GridItemHTMLElement, panel: AppPanel, targetTabId: string) => {
      const targetGrid = gridByTabId.current.get(targetTabId)
      const updated: AppPanel = { ...panel, tabId: targetTabId }

      if (targetGrid) {
        findEmptyArea(updated, targetGrid)
      } else {
        updated.x = -1
        updated.y = -1
      }

      grid.removeWidget(element, false, false)
      void cs.updatePanel(updated).then(() => {
        void getServerState().setUserChannel(updated.panelId, targetTabId)
      })
    }

    const setResizing = (resizing: boolean) => {
      container.classList.toggle(styles.resizing!, resizing)
    }

    grid.on("dragstart", () => {
      dropTargetTabId.current = null
    })
    grid.on("dragstart resizestart", () => setResizing(true))
    grid.on("dragstop resizestop", (_event: Event, element: GridItemHTMLElement) => {
      setResizing(false)

      const node = element.gridstackNode
      if (!node?.id) {
        return
      }

      const panel = cs.getPanels().find(p => p.panelId === node.id)
      if (!panel) {
        return
      }

      const targetTabId = dropTargetTabId.current
      dropTargetTabId.current = null

      if (targetTabId && targetTabId !== tabId) {
        movePanelToTab(element, panel, targetTabId)
        return
      }

      persistPanelGeometry(element)
    })
    grid.on("removed", (_event, items) => {
      items.forEach(item => {
        if (item.id) {
          void cs.removePanel(item.id)
        }
      })
    })

    return () => {
      gridByTabId.current.delete(tabId)
      grid.destroy(false)
      gridRef.current = null
      itemRefs.current.clear()
    }
  }, [cs, tabId, dropTargetTabId, gridByTabId])

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) {
      return
    }

    const panelIds = new Set(panels.map(p => p.panelId))

    grid.getGridItems().forEach(item => {
      const id = item.gridstackNode?.id
      if (id && !panelIds.has(id)) {
        grid.removeWidget(item, true, false)
      }
    })

    panels.forEach(panel => {
      const element = itemRefs.current.get(panel.panelId) as GridItemHTMLElement | undefined
      if (!element || element.gridstackNode) {
        return
      }

      const placement = { ...panel }
      if ((placement.x ?? -1) < 0 || (placement.y ?? -1) < 0) {
        findEmptyArea(placement, grid)
        void cs.updatePanel(placement)
      }

      grid.makeWidget(element, {
        id: panel.panelId,
        x: placement.x,
        y: placement.y,
        w: placement.w,
        h: placement.h,
      })
    })
  }, [panels, cs])

  return (
    <div
      ref={gridContainerRef}
      className="grid-stack"
      style={{ display: visible ? "block" : "none", height: "100%" }}
    >
      {panels.map(panel => (
        <div
          key={panel.panelId}
          ref={element => {
            if (element) {
              itemRefs.current.set(panel.panelId, element)
            } else {
              itemRefs.current.delete(panel.panelId)
            }
          }}
          className="grid-stack-item"
        >
          <div className="grid-stack-item-content">
            <PanelContent panel={panel} cs={cs} />
          </div>
        </div>
      ))}
    </div>
  )
}

function PanelContent({ panel, cs }: { panel: AppPanel; cs: ClientState }) {
  const activeTab = cs.getActiveTab()

  return (
    <div className={styles.content}>
      <div className={styles.contentInner}>
        <div
          className={styles.contentTitle}
          style={{ borderLeft: `3px solid ${activeTab.background}` }}
        >
          <p className={styles.contentTitleText}>
            <span className={styles.contentTitleTextSpan}>{panel.title}</span>
          </p>
          <AppStateIcon instanceId={panel.panelId} />
          <CloseIcon
            action={() => {
              void cs.removePanel(panel.panelId)
            }}
          />
        </div>
        <div className={styles.resizeBaffle} />
        <div className={styles.contentBody}>
          {panel.url ? (
            <iframe
              src={panel.url}
              id={"iframe_" + panel.panelId}
              name={panel.panelId}
              className={styles.iframe}
              onLoad={event => {
                const win = event.currentTarget.contentWindow
                if (win) {
                  getAppState().registerAppWindow(win, panel.panelId)
                }
              }}
            />
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  )
}

function AppStateIcon({ instanceId }: { instanceId: string }) {
  const iconBase = "/icons/app-state/"
  const state = getServerState().getAppInstanceState(instanceId)

  function symbolForState(state: AppInstanceState | undefined): [string, string] | null {
    switch (state) {
      case AppInstanceState.Connected:
        return [iconBase + "connected.svg", "Connected to FDC3"]
      case AppInstanceState.Pending:
        return [iconBase + "pending.svg", "Pending"]
      case AppInstanceState.Terminated:
        return [iconBase + "terminated.svg", "Terminated"]
      default:
        // Hide Unknown — a "?" looks like help and adds little signal.
        // "Not Responding" has no equivalent on the current agent surface;
        // not-responding.svg is retained for when heartbeat health is exposed.
        return null
    }
  }

  const symbol = symbolForState(state)
  if (!symbol) {
    return null
  }

  const [src, title] = symbol
  return <img src={src} className={styles.contentTitleIcon} title={title} />
}

function CloseIcon({ action }: { action: () => void }) {
  return (
    <button
      type="button"
      className={`${styles.contentTitleButton} ${styles.contentTitleClose}`}
      title="Close app"
      aria-label="Close app"
      onClick={() => action()}
    >
      <X className={styles.contentTitleCloseIcon} aria-hidden strokeWidth={2.5} />
    </button>
  )
}

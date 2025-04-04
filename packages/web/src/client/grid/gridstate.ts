import { GridItemHTMLElement, GridStack, GridStackElement, GridStackWidget } from "gridstack"
import { ReactElement } from "react"
import { AppPanel, ClientState, getServerState } from "@finos/fdc3-sail-common"
import { createRoot, Root } from 'react-dom/client';
import styles from "./styles.module.css";


const TRASH_DROP = "trash";

export interface GridsState {

    updatePanels(): void

}

type MountedPanel = AppPanel & {
    mountedTab: string
}

export function gridIdforTab(tabId: string): string {
    return "_gs_" + tabId
}

export function contentIdforTab(tabId: string): string {
    return "_content_" + tabId
}

export class GridsStateImpl implements GridsState {

    private readonly gridstacks: { [id: string]: GridStack } = {}
    private readonly cs: ClientState
    private readonly containerId: string
    private readonly render: (ap: AppPanel, id: string) => ReactElement
    private readonly roots: Map<string, Root> = new Map()

    // tracks state of grids
    private panelsInGrid: MountedPanel[] = []
    // keeps track of drop locations
    private newTabState: HTMLElement | null = null

    constructor(containerId: string, render: (ap: AppPanel, id: string) => ReactElement, cs: ClientState) {
        this.containerId = containerId
        this.render = render
        this.cs = cs
    }

    findEmptyArea(ap: AppPanel, grid: GridStack) {
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x <= grid.getColumn() - (ap.w ?? 1); x++) {
                if (grid.isAreaEmpty(x, y, ap.w ?? 1, ap.h ?? 1)) {
                    ap.x = x;
                    ap.y = y;
                    return;
                }
            }
        }
        ap.x = 0;
        ap.y = 0;
        return
    }

    getPanel(id: string): AppPanel | undefined {
        return this.cs.getPanels().find(p => p.panelId == id);
    }

    removePanel(ap: AppPanel) {
        const grid = this.gridstacks[ap.tabId]
        const el = this.findChild(grid.el, ap.panelId)
        if (el) {
            grid.removeWidget(el)
        }
    }

    setupTabDropping() {
        Array.from(document.querySelectorAll(".drop-tab")).forEach(t => {
            const tab = t as HTMLElement
            GridStack.getDD().droppable(tab, {
                accept: () => {
                    return true;
                }
            })
                .on(tab, 'dropover', () => { this.newTabState = tab })
                .on(tab, 'dropout', () => { this.newTabState = null });
        })
    }

    setResizing(resizing: boolean, element: HTMLElement) {
        if (resizing) {
            element.parentElement?.classList.add(styles.resizing)
        } else {
            element.parentElement?.classList.remove(styles.resizing)
        }
    }

    createGridstack(e: Element): GridStack {
        //const gridId = gridIdforTab(tabId)
        const grid = GridStack.init(
            {
                removable: "#" + TRASH_DROP,
                acceptWidgets: true,
                margin: '1',
                cellHeight: '70px',
                resizable: {
                    handles: 'e, se, s, sw, w'

                }
            },
            e as GridStackElement
        )

        grid.on("resizestop", (_event, element) => {
            const node = element.gridstackNode
            if (node) {
                const panel = this.getPanel(node.id!)
                if (panel) {
                    panel.w = node.w
                    panel.h = node.h
                    this.cs.updatePanel(panel)
                }
            }

            this.setResizing(false, element)
        })

        grid.on("resizestart", (_event, element) => {
            this.setResizing(true, element)
        })

        grid.on("removed", (event, items) => {
            const targetId = (event.target as HTMLElement).getAttribute("id");
            if (targetId == TRASH_DROP) {
                items.forEach((i) => this.cs.removePanel(i.id!))
            }
        })

        this.setupTabDropping()

        //allow dragging on the grid, and also consider new tabs.
        grid.on("dragstop", (_event, element) => {
            const node = element.gridstackNode
            if (node) {
                const panel = this.getPanel(node.id!)
                if (panel) {
                    if (this.newTabState) {
                        const newTabId = this.newTabState.getAttribute("id")!
                        const newGrid = this.gridstacks[newTabId]
                        this.findEmptyArea(panel, newGrid)
                        panel.tabId = newTabId
                    } else {
                        panel.x = node.x
                        panel.y = node.y
                    }
                    this.cs.updatePanel(panel)
                }
            }

            this.setResizing(false, element)
        })

        grid.on("dragstart", (_event, element) => {
            this.setResizing(true, element)
        })

        return grid
    }


    ensureGrid(container: ShadowRoot, tabId: string): GridStack {
        let gridEl = null
        const td = this.cs.getTabs().find(t => t.id == tabId)
        let gs = this.gridstacks[tabId]
        if (!gs) {
            gridEl = document.createElement("div")
            gridEl.setAttribute("id", gridIdforTab(tabId))
            gridEl.setAttribute("class", "grid-stack")
            container.appendChild(gridEl)

            gs = this.createGridstack(gridEl)
            this.gridstacks[tabId] = gs
            gridEl.classList.add()
            container.appendChild(gridEl);
        } else {
            gridEl = this.findChild(container, gridIdforTab(tabId))
        }

        if (gridEl) {
            const active = this.cs.getActiveTab().id == td?.id
            gridEl.setAttribute("style", `display: ${active ? "block" : "none"}; `)
        }

        return gs;
    }

    createWidget(grid: GridStack, p: AppPanel, content: boolean): GridItemHTMLElement {
        // check the panel size
        if (p.x == -1 || p.y == -1) {
            this.findEmptyArea(p, grid)
        }

        // add to the grid
        const opts: GridStackWidget = {
            h: p.h,
            w: p.w,
            x: p.x,
            y: p.y,
            id: p.panelId,
            content: content ? `<div id = "${contentIdforTab(p.panelId)}" /> ` : ""
        }

        // create the widget
        const widget = grid.addWidget(opts)
        widget.setAttribute("id", p.panelId)
        return widget
    }

    addPanel(grid: GridStack, p: AppPanel) {
        // new panel
        const widget = this.createWidget(grid, p, true)

        // add content to it
        const div = widget.children[0]
        const root = createRoot(div)
        this.roots.set(p.panelId, root)
        const content = this.render(p, contentIdforTab(p.panelId))
        root.render(content)
    }

    refreshPanel(p: AppPanel) {
        const root = this.roots.get(p.panelId)
        if (root) {
            const content = this.render(p, contentIdforTab(p.panelId))
            root.render(content)
        }
    }

    findChild(e: DocumentFragment | HTMLElement | Element, id: string): HTMLElement | null {
        return Array.from(e.children).find(c => c.getAttribute("id") == id) as HTMLElement
    }

    changeTab(container: DocumentFragment, p: MountedPanel) {
        const oldGridEl = Array.from(container.children)
            .filter(e => e.tagName == 'DIV')
            .filter(e => this.findChild(e, p.panelId))[0]

        const oldWidget = this.findChild(oldGridEl, p.panelId) as GridItemHTMLElement

        if (oldWidget) {
            const newGrid = this.gridstacks[p.tabId]
            this.addPanel(newGrid, p)

            // remove old
            const gridId = oldGridEl?.getAttribute("id")?.substring(4)
            if (gridId) {
                const oldGrid = this.gridstacks[gridId]
                oldGrid.removeWidget(oldWidget, false)
            }
            oldGridEl.removeChild(oldWidget)
        }

        getServerState().setUserChannel(p.panelId, p.tabId)
    }


    updatePanels(): void {
        const container = document.getElementById(this.containerId)!

        let shadowRoot = container.shadowRoot
        if (!shadowRoot) {
            // this ensures styling of the contents of the grid
            shadowRoot = container.attachShadow({ mode: 'open' })
            const styles = Array.from(document.querySelectorAll("style"));
            const links = Array.from(document.querySelectorAll("link")).filter(l => l.href.endsWith(".css"));
            [...styles, ...links].map(el => el.cloneNode(true))
                .forEach(el => shadowRoot!.appendChild(el))
        }

        // remove old panels
        const panelIds = this.cs.getPanels().map(p => p.panelId)
        const mountedIds = this.panelsInGrid.map(p => p.panelId)
        const removedPanels = this.panelsInGrid.filter(p => !panelIds.includes(p.panelId))
        const changedTabPanels = this.panelsInGrid.filter(p => p.mountedTab != this.cs.getPanels().find(q => q.panelId == p.panelId)?.tabId)
        const addedPanels = this.cs.getPanels().filter(p => !mountedIds.includes(p.panelId))

        // reset destination
        this.newTabState = null

        // ensure all grids exist
        this.cs.getTabs().forEach(t => this.ensureGrid(shadowRoot, t.id))

        // unchanged panels
        this.panelsInGrid = this.panelsInGrid.filter(cp => {
            const removing = removedPanels.find(k => k.panelId == cp.panelId)
            const moving = changedTabPanels.find(k => k.panelId == cp.panelId)

            if (removing || moving) {
                return false;
            } else {
                return true
            }
        })

        this.panelsInGrid.forEach(p => this.refreshPanel(p))

        // console.log(`Moved Tab: ${changedTabPanels.length} Removed: ${removedPanels.length} Added: ${addedPanels.length} Unchanged: ${this.panelsInGrid.length}`)


        removedPanels.forEach(p => this.removePanel(p))

        changedTabPanels.forEach(mp => {
            const cp = this.cs.getPanels().find(p => p.panelId == mp.panelId)
            if (cp) {
                mp.tabId = cp.tabId
                this.changeTab(shadowRoot, mp)
                this.panelsInGrid.push({
                    ...mp,
                    mountedTab: mp.tabId
                })
            }
        })

        addedPanels.forEach(ap => {
            const gs = this.ensureGrid(shadowRoot, ap.tabId)
            this.addPanel(gs, ap)
            this.panelsInGrid.push({
                ...ap,
                mountedTab: ap.tabId
            })
        })

        // console.log("Panels in grid " + JSON.stringify(this.panelsInGrid))
    }

}


import { GridStackPosition } from "gridstack"
import { v4 as uuidv4 } from 'uuid';
import { DesktopAgentHelloArgs } from "../../server/da/message-types";
import { AppIntent, Context, DisplayMetadata } from "@kite9/fdc3";
import { ChannelType, ChannelState, DirectoryApp } from "@kite9/fdc3-web-impl";
import { getServerState } from "./ServerState";

const STORAGE_KEY = "sail-client-state"

export type AppPanel = GridStackPosition & {
    title: string
    url: string,
    tabId: string
    panelId: string,
    appId: string
}

export type TabDetail = {
    title: string,
    id: string,
    icon: string,
    background: string,
}

export type Directory = {
    label: string,
    url: string,
    active: boolean
}

export type IntentResolution = {
    appIntents: AppIntent[]
    requestId: string,
    context: Context
}

export interface ClientState {

    /** User Session ID */
    getUserSessionID(): string

    /** Tabs */
    getActiveTab(): TabDetail
    setActiveTabId(n: string): void
    getTabs(): TabDetail[]
    addTab(td: TabDetail): void
    removeTab(id: string): void

    /** Panel State */
    updatePanel(ap: AppPanel): void
    removePanel(id: string): void
    getPanels(): AppPanel[]
    newPanel(detail: DirectoryApp, instanceId: string): AppPanel

    /** App Directory */
    setDirectories(d: Directory[]): void
    getDirectories(): Directory[]
    updateDirectory(din: Directory): void

    /** Callback */
    addStateChangeCallback(cb: () => void): void

    /**
     * For connecting to the server
     */
    createArgs(): DesktopAgentHelloArgs

    /**
     * Triggers intent resolution
     */
    getIntentResolution(): IntentResolution | null
    setIntentResolution(ir: IntentResolution | null): void

}

abstract class AbstractClientState implements ClientState {

    protected tabs: TabDetail[] = []
    protected panels: AppPanel[] = []
    protected activeTabId: string
    protected readonly userSessionId: string
    protected directories: Directory[] = []
    callbacks: (() => void)[] = []
    protected intentResolution: IntentResolution | null = null

    constructor(tabs: TabDetail[], panels: AppPanel[], activeTabId: string, userSessionId: string, directories: Directory[]) {
        this.tabs = tabs
        this.panels = panels
        this.activeTabId = activeTabId
        this.userSessionId = userSessionId
        this.directories = directories
        this.saveState()
    }

    abstract saveState(): void

    /** Tabs */
    getActiveTab(): TabDetail {
        return this.tabs.find(t => t.id == this.activeTabId)!!
    }

    setActiveTabId(id: string) {
        this.activeTabId = id
        this.saveState()
    }

    getTabs(): TabDetail[] {
        return this.tabs
    }

    addTab(td: TabDetail) {
        this.tabs.push(td)
        this.saveState()
    }

    removeTab(id: string) {
        this.tabs = this.tabs.filter(t => t.id != id)
        this.saveState()
    }

    /** Panels */
    updatePanel(ap: AppPanel): void {
        // console.log("Panels " + JSON.stringify(this.panels))
        const idx = this.panels.findIndex(p => p.panelId == ap.panelId)
        if (idx != -1) {
            this.panels[idx] = ap
        } else {
            this.panels.push(ap)
        }

        // console.log("Total Panels: " + this.panels.length)

        this.saveState()
    }

    removePanel(id: string): void {
        this.panels = this.panels.filter(p => p.panelId != id)
        this.saveState()
    }

    newPanel(detail: DirectoryApp, instanceId: string): AppPanel {
        if (detail.type == 'web') {
            const url = (detail.details as any).url

            const ap = {
                x: -1,
                y: -1,
                w: 6,
                h: 8,
                title: detail.title,
                tabId: this.activeTabId,
                panelId: instanceId,
                url,
                appId: detail.appId
            } as AppPanel

            this.panels.push(ap)
            this.saveState()
            return ap
        } else {
            throw new Error("Unsupported app type: " + detail.type)
        }
    }

    getPanels(): AppPanel[] {
        return this.panels
    }

    addStateChangeCallback(cb: () => void) {
        this.callbacks.push(cb)
    }

    getUserSessionID(): string {
        return this.userSessionId
    }

    setDirectories(d: Directory[]): void {
        this.directories = d
        this.saveState()
    }

    getDirectories(): Directory[] {
        return this.directories
    }

    updateDirectory(din: Directory) {
        const idx = this.directories.findIndex(d => d.url == din.url)
        if (idx > -1) {
            this.directories[idx] = din
        } else {
            this.directories.push(din)
        }

        this.saveState()
    }

    createArgs(): DesktopAgentHelloArgs {
        return {
            userSessionId: this.userSessionId,
            directories: this.directories.filter(d => d.active).map(d => d.url),
            channels: this.tabs.map(t => {
                return {
                    id: t.id,
                    type: ChannelType.user,
                    displayMetadata: {
                        color: t.background,
                        glyph: t.icon,
                        name: t.title,
                    } as DisplayMetadata,
                    context: []
                } as ChannelState
            }),
        }
    }

    getIntentResolution(): IntentResolution | null {
        return this.intentResolution
    }

    setIntentResolution(ir: IntentResolution | null): void {
        this.intentResolution = ir
        this.saveState()
    }

}

class LocalStorageClientState extends AbstractClientState {

    constructor() {
        const theState = localStorage.getItem(STORAGE_KEY)
        if (theState) {
            const { tabs, panels, activeTabId, userSessionId, directories } = JSON.parse(theState)
            super(tabs, panels, activeTabId, userSessionId, directories)
        } else {
            super(DEFAULT_TABS, DEFAULT_PANELS, DEFAULT_TABS[0].id, "user-" + uuidv4(), DEFAULT_DIRECTORIES)
        }
    }

    saveState(): void {
        const data = JSON.stringify({ tabs: this.tabs, panels: this.panels, activeTabId: this.activeTabId, userSessionId: this.userSessionId, directories: this.directories })
        localStorage.setItem(STORAGE_KEY, data)
        this.callbacks.forEach(cb => cb())
        getServerState().sendClientState(this.tabs, this.directories)
    }

}

const DEFAULT_DIRECTORIES: Directory[] = [
    {
        label: "FDC3 Demo Apps",
        url: "./directory/appd.json",
        active: false
    },
    {
        label: "FDC3 Conformance",
        url: "./directory/local-conformance-2_0.v2.json",
        active: false
    },
    {
        label: "FINOS FDC3 Directory",
        url: "https://directory.fdc3.finos.org/v2/apps/",
        active: false
    },
    {
        label: "Sail Built-In Apps",
        url: "./directory/sail.json",
        active: true
    },
    {
        label: "Developer Tutorial",
        url: "./directory/training-appd.v2.json",
        active: true
    }
]


const DEFAULT_TABS: TabDetail[] = [
    {
        title: "One",
        id: "one",
        icon: "/static/icons/tabs/one.svg",
        background: '#123456',
    },
    {
        title: "Two",
        id: "two",
        icon: "/static/icons/tabs/two.svg",
        background: '#564312',
    },
    {
        title: "Three",
        id: "three",
        icon: "/static/icons/tabs/three.svg",
        background: '#125634',
    }
]

const DEFAULT_PANELS: AppPanel[] = [
]

const theState = new LocalStorageClientState()

export function getClientState(): ClientState {
    return theState
}
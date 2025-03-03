import { ChannelType, ChannelState, DirectoryApp } from "@finos/fdc3-web-impl";
import { AppPanel, ClientState, IntentResolution } from "./ClientState";
import { DesktopAgentHelloArgs, Directory, TabDetail } from "./message-types";
import { DisplayMetadata } from "@finos/fdc3-standard";

export abstract class AbstractClientState implements ClientState {

    protected tabs: TabDetail[] = []
    protected panels: AppPanel[] = []
    protected activeTabId: string
    protected readonly userSessionId: string
    protected directories: Directory[] = []
    callbacks: (() => void)[] = []
    protected intentResolution: IntentResolution | null = null
    protected knownApps: DirectoryApp[] = []

    constructor(tabs: TabDetail[], panels: AppPanel[], activeTabId: string, userSessionId: string, directories: Directory[], knownApps: DirectoryApp[]) {
        this.tabs = tabs
        this.panels = panels
        this.activeTabId = activeTabId
        this.userSessionId = userSessionId
        this.directories = directories
        this.knownApps = knownApps
    }

    abstract updateKnownApps(): Promise<void>

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

    newPanel(detail: DirectoryApp, instanceId: string, title: string): AppPanel {
        if (detail.type == 'web') {
            const url = (detail.details as any).url

            const ap = {
                x: -1,
                y: -1,
                w: 6,
                h: 8,
                title: title,
                tabId: this.activeTabId,
                panelId: instanceId,
                url,
                appId: detail.appId,
                icon: detail.icons?.[0]?.src ?? null
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


    getKnownApps(): DirectoryApp[] {
        return this.knownApps
    }

    setKnownApps(apps: DirectoryApp[]): void {
        this.knownApps = apps
        this.saveState()
    }

}
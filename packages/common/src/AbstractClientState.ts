import { ChannelType, DirectoryApp, WebAppDetails } from "@finos/fdc3-web-impl";
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

    abstract saveState(): Promise<void>

    /** Tabs */
    getActiveTab(): TabDetail {
        const out = this.tabs.find(t => t.id == this.activeTabId)
        if (!out) {
            this.activeTabId = this.tabs[0].id
            this.saveState().catch(() => {
                console.error("Error saving state")
            })
            return this.tabs[0]
        }
        return out
    }

    async setActiveTabId(id: string): Promise<void> {
        this.activeTabId = id
        await this.saveState()
    }

    getTabs(): TabDetail[] {
        return this.tabs
    }

    async addTab(td: TabDetail): Promise<void> {
        this.tabs.push(td)
        await this.saveState()
    }

    async removeTab(id: string): Promise<void> {
        this.tabs = this.tabs.filter(t => t.id != id)
        await this.saveState()
    }

    async updateTab(td: TabDetail): Promise<void> {
        const idx = this.tabs.findIndex(t => t.id == td.id)
        if (idx != -1) {
            this.tabs[idx] = td
        }
        await this.saveState()
    }

    async moveTab(id: string, delta: "up" | "down"): Promise<void> {
        const idx = this.tabs.findIndex(t => t.id == id)
        if (idx != -1) {
            if ((delta == "up") && (idx > 0)) {
                const temp = this.tabs[idx - 1]
                this.tabs[idx - 1] = this.tabs[idx]
                this.tabs[idx] = temp
            } else if ((delta == "down") && (idx < this.tabs.length - 1)) {
                const temp = this.tabs[idx + 1]
                this.tabs[idx + 1] = this.tabs[idx]
                this.tabs[idx] = temp
            }
        }

        await this.saveState()
    }

    /** Panels */
    async updatePanel(ap: AppPanel): Promise<void> {
        // console.log("Panels " + JSON.stringify(this.panels))
        const idx = this.panels.findIndex(p => p.panelId == ap.panelId)
        if (idx != -1) {
            this.panels[idx] = ap
        } else {
            this.panels.push(ap)
        }

        // console.log("Total Panels: " + this.panels.length)

        await this.saveState()
    }

    async removePanel(id: string): Promise<void> {
        this.panels = this.panels.filter(p => p.panelId != id)
        await this.saveState()
    }

    newPanel(detail: DirectoryApp, instanceId: string, title: string): AppPanel {
        if (detail.type == 'web') {
            const url = (detail.details as WebAppDetails).url

            const ap: AppPanel = {
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
            }

            this.panels.push(ap)
            this.saveState().catch((e: unknown) => {
                console.error("Error saving state", e)
            })
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

    async setDirectories(d: Directory[]): Promise<void> {
        this.directories = d
        await this.saveState()
    }

    getDirectories(): Directory[] {
        return this.directories
    }

    async updateDirectory(din: Directory) {
        const idx = this.directories.findIndex(d => d.url == din.url)
        if (idx > -1) {
            this.directories[idx] = din
        } else {
            this.directories.push(din)
        }

        await this.saveState()
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
                    } as DisplayMetadata,
                    context: []
                }
            }),
        }
    }

    getIntentResolution(): IntentResolution | null {
        return this.intentResolution
    }

    setIntentResolution(ir: IntentResolution | null): void {
        this.intentResolution = ir
        this.saveState().catch((e: unknown) => {
            console.error("Error saving state", e)
        })
    }


    getKnownApps(): DirectoryApp[] {
        console.log(`SAIL Get Known Apps: ${this.knownApps.length.toString()}`)
        return this.knownApps
    }

    async setKnownApps(apps: DirectoryApp[]): Promise<void> {
        this.knownApps = apps
        console.log(`SAIL Set Known Apps: ${this.knownApps.length.toString()}`)
        await this.saveState()
    }

}
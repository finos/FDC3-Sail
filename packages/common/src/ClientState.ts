import { GridStackPosition } from "gridstack"
import { DesktopAgentHelloArgs, TabDetail, Directory, AugmentedAppIntent } from "./message-types";
import { Context } from "@finos/fdc3-context";
import { DirectoryApp } from "@finos/fdc3-web-impl";

export type AppPanel = GridStackPosition & {
    title: string
    url: string,
    tabId: string
    panelId: string,  // the instanceId of the app
    appId: string,
    icon: string | null
}

export type IntentResolution = {
    appIntents: AugmentedAppIntent[]
    requestId: string,
    context: Context
}

/**
 * This stores the state of the DesktopAgent on the client.
 * That is, positions of panels, tabs, details of directories set up, active tab etc.
 */
export interface ClientState {

    /** User Session ID */
    getUserSessionID(): string

    /** Tabs */
    getActiveTab(): TabDetail
    setActiveTabId(n: string): Promise<void>
    getTabs(): TabDetail[]
    addTab(td: TabDetail): Promise<void>
    removeTab(id: string): Promise<void>
    updateTab(td: TabDetail): Promise<void>
    moveTab(id: string, delta: "up" | "down"): Promise<void>

    /** Panel State */
    updatePanel(ap: AppPanel): Promise<void>
    removePanel(id: string): Promise<void>
    getPanels(): AppPanel[]
    newPanel(detail: DirectoryApp, instanceId: string, title: string): AppPanel

    /** App Directory */
    setDirectories(d: Directory[]): Promise<void>
    getDirectories(): Directory[]
    updateDirectory(din: Directory): Promise<void>
    getKnownApps(): DirectoryApp[]
    setKnownApps(apps: DirectoryApp[]): Promise<void>

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

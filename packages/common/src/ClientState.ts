import { GridStackPosition } from "gridstack"
import { TabDetail, Directory, AugmentedAppIntent, SailClientStateArgs } from "./message-types";
import { Context } from "@finos/fdc3-context";
import { DirectoryApp } from "@finos/fdc3-sail-da-impl";

/**
 * The property name of the connection URL for a remote app.
 */
export const FDC3_WEBSOCKET_PROPERTY = 'connectionUrl'

export type AppPanel = GridStackPosition & {
    title: string
    url: string,
    tabId: string
    panelId: string,  // the instanceId of the app
    appId: string,
    icon: string | null
}

export interface IntentResolution {
    appIntents: AugmentedAppIntent[]
    requestId: string
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

    /** Provided by the server as a view of the apps within the directories */
    getKnownApps(): DirectoryApp[]
    setKnownApps(apps: DirectoryApp[]): Promise<void>

    /** Custom Apps, configured by the user  */
    setCustomApps(apps: DirectoryApp[]): Promise<void>
    getCustomApps(): DirectoryApp[]

    /** Callback */
    addStateChangeCallback(cb: () => void): void

    /**
     * For connecting to the server
     */
    createArgs(): SailClientStateArgs

    /**
     * Triggers intent resolution
     */
    getIntentResolution(): IntentResolution | null
    setIntentResolution(ir: IntentResolution | null): void

    /**
     * Context History
     */
    getContextHistory(tabId: string): Context[]
    appendContextHistory(tabId: string, item: Context): Promise<void>
}

import { GridStackPosition } from "gridstack"
import { DesktopAgentHelloArgs, TabDetail, Directory } from "./message-types";
import { AppIntent, Context } from "@finos/fdc3";
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
    appIntents: AppIntent[]
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
    setActiveTabId(n: string): void
    getTabs(): TabDetail[]
    addTab(td: TabDetail): void
    removeTab(id: string): void

    /** Panel State */
    updatePanel(ap: AppPanel): void
    removePanel(id: string): void
    getPanels(): AppPanel[]
    newPanel(detail: DirectoryApp, instanceId: string, title: string): AppPanel

    /** App Directory */
    setDirectories(d: Directory[]): void
    getDirectories(): Directory[]
    updateDirectory(din: Directory): void
    getKnownApps(): DirectoryApp[]
    setKnownApps(apps: DirectoryApp[]): void

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

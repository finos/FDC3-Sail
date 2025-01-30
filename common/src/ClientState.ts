import { GridStackPosition } from "gridstack"
import { DesktopAgentHelloArgs, TabDetail, Directory } from "./message-types";
import { AppIntent, Context } from "@finos/fdc3";
import { DirectoryApp } from "@finos/fdc3-web-impl";

export type AppPanel = GridStackPosition & {
    title: string
    url: string,
    tabId: string
    panelId: string,
    appId: string
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

export declare function getClientState(): ClientState

import { TabDetail, Directory, SailClientStateArgs } from "@finos/fdc3-sail-shared";
import { Context } from "@finos/fdc3-context";
import { DirectoryApp } from "@finos/fdc3-web-impl";

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

    // Intent resolution methods moved to web package implementation

    /**
     * Context History
     */
    getContextHistory(tabId: string): Context[]
    appendContextHistory(tabId: string, item: Context): Promise<void>
}
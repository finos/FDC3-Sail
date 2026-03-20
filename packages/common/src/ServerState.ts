import { DirectoryApp } from "@finos/fdc3-sail-da-impl"
import { AppHosting } from "./app-hosting"
import { SailClientStateArgs } from "./message-types"
import { AppIdentifier } from "@finos/fdc3-standard"
import { ClientState } from "./ClientState"
import { AppState } from "./AppState"


/**
 * This is the interface the web desktop agent uses to communicate with the 
 * back-end FDC3 server. 
 */
export interface ServerState {

    init(cs: ClientState, as: AppState): void

    /**
     * Call on startup to register the desktop agent with the server
     */
    registerDesktopAgent(props: SailClientStateArgs): Promise<void>

    /**
     * Called when an application begins the WCP handshake process.
     * Returns the instance ID of the app.
     */
    registerAppLaunch(appId: string, hosting: AppHosting, channel: string | null, instanceTitle: string): Promise<string>

    /**
     * Allows the client to query the app directory from the server, 
     * used to display the App Picker.
     */
    getApplications(): Promise<DirectoryApp[]>

    /**
     * Sets the user channel of an app in the client.  Used when moving apps
     * between tabs.
     */
    setUserChannel(instanceId: string, channel: string): Promise<void>

    /**
     * Used when the intent resolver is managed by the desktop agent as opposed
     * to running inside an iframe in the client app.
     */
    intentChosen(requestId: string, ai: AppIdentifier | null, intent: string | null, channel: string | null): void

    /**
     * This is used when the user changes the directories or the details of the
     * tabs they have on screen.  The server needs to know about this change
     * of avaiiable apps or user channels.
     */
    sendClientState(cs: SailClientStateArgs): Promise<void>
}
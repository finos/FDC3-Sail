import { DirectoryApp } from "@finos/fdc3-web-impl"
import { AppHosting } from "./app-hosting"
import { DesktopAgentHelloArgs, Directory, TabDetail } from "./message-types"
import { AppIdentifier } from "@finos/fdc3-standard"


export interface ServerState {

    /**
     * Call on startup to register the desktop agent with the server
     */
    registerDesktopAgent(props: DesktopAgentHelloArgs): Promise<void>

    /**
     * Called when an application begins the WCP handshake process.
     * Returns the instance ID of the app.
     */
    registerAppLaunch(appId: string, hosting: AppHosting): Promise<string>

    getApplications(): Promise<DirectoryApp[]>

    setUserChannel(instanceId: string, channel: string): Promise<void>

    intentChosen(ai: AppIdentifier | null, intent: string | null): Promise<void>

    sendClientState(tabs: TabDetail[], directories: Directory[]): Promise<void>
}

export declare function getServerState(): ServerState
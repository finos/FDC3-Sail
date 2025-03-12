import { DirectoryApp, State } from "@finos/fdc3-web-impl";
import { AppHosting } from "./app-hosting";
import { SailAppStateArgs } from "./message-types";
import { ServerState } from "./ServerState";
import { ClientState } from "./ClientState";

export type AppOpenDetails = {
    instanceId: string,
    channel: string | null,
    instanceTitle: string
}

/**
 * Stores the state of the applications themselves and whether or not they're
 * connected to FDC3.
 */
export interface AppState {

    init(ss: ServerState, cs: ClientState): void

    registerAppWindow(window: Window, instanceId: string): void

    open(detail: DirectoryApp, destination?: AppHosting): Promise<AppOpenDetails>

    getAppState(instanceId: string): State | undefined

    setAppState(state: SailAppStateArgs): void

    addStateChangeCallback(cb: () => void): void

}
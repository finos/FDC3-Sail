import { DirectoryApp, State } from "@finos/fdc3-web-impl";
import { AppHosting } from "./app-hosting";
import { SailAppStateArgs } from "./message-types";

export interface AppState {

    registerAppWindow(window: Window, instanceId: string): void

    open(detail: DirectoryApp, destination?: AppHosting): Promise<string>

    getAppState(instanceId: string): State | undefined

    setAppState(state: SailAppStateArgs): void

    addStateChangeCallback(cb: () => void): void

}

export declare function getAppState(): AppState

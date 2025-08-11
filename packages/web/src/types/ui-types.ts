import { GridStackPosition } from "gridstack"
import { AugmentedAppIntent } from "@finos/fdc3-sail-shared";
import { ClientState as BaseClientState } from "./ClientState";
import { Context } from "@finos/fdc3-context";

// UI-specific types for the web package
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

// Web-specific client state that includes IntentResolution methods
export interface WebClientState extends BaseClientState {
    getIntentResolution(): IntentResolution | null
    setIntentResolution(ir: IntentResolution | null): void
}
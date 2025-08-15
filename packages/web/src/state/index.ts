import { AppState } from "../types"
import { ServerState } from "../types"
import { WebClientState } from "../types"
import { DefaultAppState } from "./DefaultAppState"
import { LocalStorageClientState } from "./LocalStorageClientState"
import { ServerStateImpl } from "./ServerStateImpl"

// Web-specific state management (browser environment)
let theServerState: ServerState | null = null
let theClientState: WebClientState | null = null
let theAppState: DefaultAppState | null = null

function ensureSetup() {
    theServerState = theServerState ?? new ServerStateImpl();
    theAppState = theAppState ?? new DefaultAppState();
    theClientState = theClientState ?? new LocalStorageClientState();

    (theClientState as LocalStorageClientState).init(theServerState)
    theServerState.init(theClientState, theAppState)
    theAppState.init(theServerState, theClientState)
}

export function getServerState(): ServerState {
    ensureSetup()
    return theServerState!
}

export function getAppState(): AppState {
    ensureSetup()
    return theAppState!
}

export function getClientState(): WebClientState {
    ensureSetup()
    return theClientState!
}
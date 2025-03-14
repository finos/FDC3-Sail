import { AppState } from "./AppState"
import { ClientState } from "./ClientState"
import { DefaultAppState } from "./DefaultAppState"
import { LocalStorageClientState } from "./LocalStorageClientState"
import { ServerState } from "./ServerState"
import { ServerStateImpl } from "./ServerStateImpl"

export * from "./app-hosting"
export * from "./ClientState"
export * from "./message-types"
export * from "./AppState"
export * from "./ServerState"

let theServerState: ServerState | null = null
let theClientState: ClientState | null = null
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

export function getClientState(): ClientState {
    ensureSetup()
    return theClientState!
}
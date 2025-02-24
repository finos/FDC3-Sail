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

var theServerState: ServerState | null = null
var theClientState: ClientState | null = null
var theAppState: DefaultAppState | null = null

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
    return theServerState!!
}

export function getAppState(): AppState {
    ensureSetup()
    return theAppState!!
}

export function getClientState(): ClientState {
    ensureSetup()
    return theClientState!!
}

export function getSailUrl(): string {
    return "http://localhost:8090/static/index.html"
}
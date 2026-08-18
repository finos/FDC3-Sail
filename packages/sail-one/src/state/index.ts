import { type AppState, DefaultAppState } from "./default-app-state"
import { type ClientState, PlatformClientState } from "./client-state"
import { SailHost, type ServerState } from "./sail-host"

export { AppHosting } from "./default-app-state"
export { AppInstanceState } from "./sail-host"
export type {
  AppPanel,
  ClientState,
  Directory,
  SailClientStateArgs,
  TabDetail,
} from "./client-state"
export type { AppState, AppOpenDetails } from "./default-app-state"
export type { ServerState } from "./sail-host"
export type { AugmentedAppIntent, AugmentedAppMetadata, IntentResolution } from "../resolver/types"

let theServerState: SailHost | null = null
let theClientState: PlatformClientState | null = null
let theAppState: DefaultAppState | null = null

function ensureSetup() {
  theServerState = theServerState ?? new SailHost()
  theAppState = theAppState ?? new DefaultAppState()
  theClientState = theClientState ?? new PlatformClientState()
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

export function bindClientStateToHost(): void {
  ensureSetup()
  theClientState!.init(theServerState!)
}

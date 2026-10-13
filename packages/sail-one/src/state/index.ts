import { readSailHostParams, type SailHostParams } from "@finos/sail-platform"
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

/** `?appId=`, `?fdc3Directory=`, `VITE_FDC3_DIRECTORY_URL`, `VITE_AUTO_RESOLVE`. */
export function hostParams(): SailHostParams {
  return readSailHostParams({
    search: window.location.search,
    viteDirectoryUrl: import.meta.env.VITE_FDC3_DIRECTORY_URL,
    viteAutoResolve: import.meta.env.VITE_AUTO_RESOLVE,
    dev: import.meta.env.DEV,
  })
}

let theServerState: SailHost | null = null
let theClientState: PlatformClientState | null = null
let theAppState: DefaultAppState | null = null

function ensureSetup() {
  theServerState =
    theServerState ??
    new SailHost({
      soleDirectory: hostParams().soleDirectory,
      autoResolve: hostParams().autoResolve,
    })
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

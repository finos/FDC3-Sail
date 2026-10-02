import { DirectoryApp, Fdc3ApiVersion, State } from "@finos/fdc3-sail-da-impl"
import { AppHosting } from "./app-hosting"
import { SailAppStateArgs } from "./message-types"
import { ServerState } from "./ServerState"
import { ClientState } from "./ClientState"

export interface AppOpenDetails {
  instanceId: string
  channel: string | null
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

  /**
   * Tear down the app container opened for this instance (tab or Sail frame).
   */
  closeApp(instanceId: string, hosting: AppHosting): Promise<void>

  getAppState(instanceId: string): State | undefined

  /** Negotiated FDC3 wire version from getAgent / APP_HELLO, if known. */
  getFdc3Version(instanceId: string): Fdc3ApiVersion | undefined

  setAppState(state: SailAppStateArgs): void

  addStateChangeCallback(cb: () => void): void
}

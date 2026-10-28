import { DirectoryApp, Fdc3ApiVersion, State } from "@finos/sail-headless-agent"
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

  /** True after DA_HELLO has completed for this browser session. */
  isDesktopAgentReady(): boolean

  /**
   * Mark the Desktop Agent connected. App iframes (grid frames and invisible
   * hosts) mount only after this, so APP_HELLO has a session to join.
   */
  markDesktopAgentReady(): void

  registerAppWindow(window: Window, instanceId: string): void

  open(detail: DirectoryApp, destination?: AppHosting): Promise<AppOpenDetails>

  /**
   * Tear down the app container opened for this instance (tab or Sail frame).
   * Invisible Frame apps hide their dialog instead of terminating.
   */
  closeApp(instanceId: string, hosting: AppHosting): Promise<void>

  /**
   * Ensure each autostart app has at least one live or pending instance.
   * Safe to call after directory refreshes (no-op when count ≥ 1).
   */
  ensureAutostartApps(apps: DirectoryApp[]): Promise<void>

  /** Live (non-terminated) instance for appId, if any. */
  findLiveInstance(appId: string): AppOpenDetails | undefined

  getAppState(instanceId: string): State | undefined

  /** Negotiated FDC3 wire version from getAgent / APP_HELLO, if known. */
  getFdc3Version(instanceId: string): Fdc3ApiVersion | undefined

  setAppState(state: SailAppStateArgs): void

  addStateChangeCallback(cb: () => void): void
}

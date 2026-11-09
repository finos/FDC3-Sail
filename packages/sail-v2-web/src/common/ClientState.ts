import { GridStackPosition } from "gridstack"
import {
  TabDetail,
  Directory,
  AugmentedAppIntent,
  SailClientStateArgs,
  WscpPairing,
} from "./message-types"
import { Context } from "@finos/fdc3-context-v3"
import { DirectoryApp } from "@finos/sail-headless-agent"
import type { SailReviewRequest } from "@finos/sail-extension"

/**
 * @deprecated Prefer the stable WSCP endpoint (`/fdc3/ws`) plus sharedSecret.
 * Kept for native AppD records that still carry a connectionUrl detail.
 */
export const FDC3_WEBSOCKET_PROPERTY = "connectionUrl"

export type AppPanel = GridStackPosition & {
  title: string
  url: string
  tabId: string
  panelId: string // the instanceId of the app
  appId: string
  icon: string | null
  /** From hostManifests.sail.invisible — hosted off-grid; shown via dialog. */
  invisible?: boolean
  /** From hostManifests.sail.singleton — at most one instance per appId. */
  singleton?: boolean
  /** Whether the invisible app dialog is currently projecting this panel. */
  dialogOpen?: boolean
}

export interface IntentResolution {
  appIntents: AugmentedAppIntent[]
  requestId: string
  context: Context
}

/**
 * This stores the state of the DesktopAgent on the client.
 * That is, positions of panels, tabs, details of directories set up, active tab etc.
 */
export interface ClientState {
  /** User Session ID */
  getUserSessionID(): string

  /** Tabs */
  getActiveTab(): TabDetail
  setActiveTabId(n: string): Promise<void>
  getTabs(): TabDetail[]
  addTab(td: TabDetail): Promise<void>
  removeTab(id: string): Promise<void>
  updateTab(td: TabDetail): Promise<void>
  moveTab(id: string, delta: "up" | "down"): Promise<void>

  /** Panel State */
  updatePanel(ap: AppPanel): Promise<void>
  removePanel(id: string): Promise<void>
  getPanels(): AppPanel[]
  newPanel(detail: DirectoryApp, instanceId: string, title: string): AppPanel

  /** App Directory */
  setDirectories(d: Directory[]): Promise<void>
  getDirectories(): Directory[]
  updateDirectory(din: Directory): Promise<void>

  /** Provided by the server as a view of the apps within the directories */
  getKnownApps(): DirectoryApp[]
  setKnownApps(apps: DirectoryApp[]): Promise<void>

  /** Custom Apps, configured by the user  */
  setCustomApps(apps: DirectoryApp[]): Promise<void>
  getCustomApps(): DirectoryApp[]

  /** Callback */
  addStateChangeCallback(cb: () => void): void

  /**
   * For connecting to the server
   */
  createArgs(): SailClientStateArgs

  /**
   * Triggers intent resolution
   */
  getIntentResolution(): IntentResolution | null
  setIntentResolution(ir: IntentResolution | null): void

  /**
   * Extension reviews waiting for the user, oldest first (see SAIL_REVIEW_REQUEST)
   */
  getReviewRequests(): SailReviewRequest[]
  /** Replaces the waiting reviews and re-renders; add/remove below are the usual entry points. */
  setReviewRequests(requests: SailReviewRequest[]): void
  /** Shows one more review, after those already waiting. */
  addReviewRequest(request: SailReviewRequest): void
  /** Closes the review with `requestId`; does nothing if it is already gone. */
  removeReviewRequest(requestId: string): void

  /**
   * Context History
   */
  getContextHistory(tabId: string): Context[]
  appendContextHistory(tabId: string, item: Context): Promise<void>

  /**
   * Splash Screen
   */
  isSplashScreenVisible(): boolean
  setSplashScreenVisible(visible: boolean): Promise<void>

  /**
   * WSCP pairings for native apps (sharedSecret + optional instanceId).
   */
  getWscpPairings(): WscpPairing[]
  getWscpPairing(appId: string): WscpPairing | undefined
  /** Create or return existing pairing for appId. Does not log the secret. */
  mintWscpPairing(appId: string): Promise<WscpPairing>
  /** Replace secret for appId (clears instanceId). */
  regenerateWscpPairing(appId: string): Promise<WscpPairing>
  /** Apply instanceId assigned by the server after WSCP connect. */
  updateWscpPairingInstanceId(
    appId: string,
    sharedSecret: string,
    instanceId: string,
  ): Promise<void>

  /** Persisted bag for one extension. Empty object when the extension has not stored anything. */
  getExtensionData(extensionId: string): Record<string, unknown>
  setExtensionData(extensionId: string, data: Record<string, unknown>): Promise<void>
}

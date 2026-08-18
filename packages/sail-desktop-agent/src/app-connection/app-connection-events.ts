import type { HostIntentResolverPayload } from "../host-contracts"
import type { AppConnectionMetadata } from "./wcp/wcp-types"

/**
 * App connection lifecycle events emitted by {@link BrowserAppConnection}.
 *
 * Sail Desktop Agent internals — not official FDC3 WCP wire messages.
 */
export interface AppConnectionEvents {
  /** Fired when an app instance completes WCP4/5 identity validation. */
  appConnected: (metadata: AppConnectionMetadata) => void

  /** Fired when an app instance disconnects (WCP6 or host teardown). */
  appDisconnected: (instanceId: string) => void

  /** Fired when WCP handshake fails before identity validation. */
  handshakeFailed: (error: Error, connectionAttemptUuid: string) => void

  /** Fired when an app's user channel membership changes; null means no channel. */
  channelChanged: (instanceId: string, channelId: string | null) => void

  /** Fired when host-owned intent resolver UI is needed for ambiguous intent delivery. */
  intentResolverNeeded: (payload: HostIntentResolverPayload) => void
}

/** Emits any {@link AppConnectionEvents} event with that event's own argument types. */
export type EmitFunction = <EventName extends keyof AppConnectionEvents>(
  event: EventName,
  ...args: Parameters<AppConnectionEvents[EventName]>
) => void

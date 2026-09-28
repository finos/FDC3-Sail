import type { BrowserTypes } from "@finos/fdc3"
import type { AppLauncher } from "../host-contracts/app-launcher"
import type { AgentState, StateSetter } from "../state/types"
import type { Logger, LogPayloadDetail } from "../logging/logger"
import type { SailDesktopAgentMetadata } from "../agent/default-config"
import type { ValidationMode } from "../dacp/validate-dacp-message"
import type { IntentResolutionCallback } from "./intent-resolution-callback"

// ============================================================================
// DACP RESPONSE DISPATCHER
// ============================================================================

export type DacpOutboundMessage =
  | BrowserTypes.AgentResponseMessage
  | BrowserTypes.AgentEventMessage
  | BrowserTypes.WebConnectionProtocolMessage

/**
 * Delivers DACP responses and events to connected app instances.
 * Handlers use this instead of a generic {@link Transport}.
 */
export interface DacpResponseDispatcher {
  /**
   * Connection owner for WCP handshake registries only
   * (pending source window, instance identity). Normal handlers should use
   * {@link sendToInstance} / {@link sendOutbound}.
   */
  readonly connectionOwner: object

  /** Send a response or event to a specific connected app instance. */
  sendToInstance(instanceId: string, message: DacpOutboundMessage): void

  /** Send on the app edge when routing metadata is already on the message. */
  sendOutbound(message: unknown): void

  /** Instance id from the inbound message path, when the edge provides one. */
  getInboundInstanceId(): string | null
}

// ============================================================================
// DACP HANDLER PARAMS
// ============================================================================

/**
 * Params passed to all DACP message handlers.
 */
export interface DACPHandlerParams {
  /** DACP response and event delivery for connected app instances */
  responses: DacpResponseDispatcher

  /** Unique identifier for this app instance */
  instanceId: string

  /** Get current state (read-only snapshot) */
  getState: () => AgentState

  /** Update state with a transform function */
  setState: StateSetter

  /** App launcher for opening/launching applications (optional) */
  appLauncher?: AppLauncher

  /**
   * Callback for requesting UI-based intent resolution when multiple handlers exist.
   * If not provided, the first handler is automatically selected.
   */
  requestIntentResolution?: IntentResolutionCallback

  /**
   * How inbound messages failing FDC3 schema validation are treated.
   * Resolved once by `resolveDesktopAgentConfig`; never absent here.
   */
  validation: ValidationMode

  /** Logger instance */
  logger: Logger

  /**
   * How much message/context detail structured logs include.
   * Resolved once by `resolveDesktopAgentConfig`; never absent here.
   */
  logPayloadDetail: LogPayloadDetail

  /** Implementation metadata for the desktop agent */
  implementationMetadata: SailDesktopAgentMetadata

  /** Timeout (ms) to wait for a context listener after open-with-context */
  openContextListenerTimeoutMs: number

  /** Timeout (ms) to keep a raised intent pending before giving up on a result */
  pendingIntentTimeoutMs: number

  /**
   * When `true`, send DACP heartbeat events for connected instances (Desktop Agent policy).
   *
   * @defaultValue `true`
   */
  heartbeatEnabled: boolean

  /** Heartbeat interval (ms) for sending heartbeat events */
  heartbeatIntervalMs: number

  /** Heartbeat timeout (ms) before considering an app unresponsive */
  heartbeatTimeoutMs: number

  /**
   * Unified instance teardown (FDC3 state + connection registry).
   * Injected by {@link SailDesktopAgent} for browser and headless ingest paths.
   */
  disconnectInstance?: (instanceId: string) => void

  /**
   * Host shell notification when user-channel membership changes without a DACP
   * channelChangedEvent on the app edge (app-originated join/leave, no listeners).
   */
  notifyChannelMembershipChanged?: (instanceId: string, channelId: string | null) => void
}

import type { BrowserTypes } from "@finos/fdc3"
import type { Logger } from "../../logging/logger"
import type {
  AppRequestMessage,
  AgentEventMessage,
  AgentResponseMessage,
  WebConnectionProtocolMessage,
} from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"

export type WCP1HelloMessage = BrowserTypes.WebConnectionProtocol1Hello
export type WCP3HandshakeMessage = BrowserTypes.WebConnectionProtocol3Handshake

/**
 * Union type for all DACP and WCP messages
 * Uses official FDC3 schema types for full type safety
 */
export type DACPMessage =
  | AppRequestMessage
  | AgentResponseMessage
  | AgentEventMessage
  | WebConnectionProtocolMessage

/**
 * Type guard to check if a message has the basic structure of a DACP message
 *
 * Note: Type guard parameters MUST be 'unknown' per TypeScript type narrowing requirements.
 * This is the correct pattern for validating untrusted external input.
 */
export function isDACPMessage(message: unknown): message is DACPMessage {
  return (
    message !== null &&
    typeof message === "object" &&
    "type" in message &&
    typeof message.type === "string" &&
    "meta" in message &&
    message.meta !== null &&
    typeof message.meta === "object"
  )
}

/**
 * Type guard to check if a message is from an app (request or WCP message)
 *
 * Note: Type guard parameters MUST be 'unknown' per TypeScript type narrowing requirements.
 */
export function isAppMessage(
  message: unknown,
): message is AppRequestMessage | WebConnectionProtocolMessage {
  return (
    isDACPMessage(message) && (message.type.endsWith("Request") || message.type.startsWith("WCP"))
  )
}

/**
 * Type guard to check if a message is from Desktop Agent (response or event)
 *
 * Note: Type guard parameters MUST be 'unknown' per TypeScript type narrowing requirements.
 */
export function isAgentMessage(
  message: unknown,
): message is AgentResponseMessage | AgentEventMessage | WebConnectionProtocolMessage {
  return (
    isDACPMessage(message) &&
    (message.type.endsWith("Response") ||
      message.type.endsWith("Event") ||
      message.type.startsWith("WCP"))
  )
}

/** WCP3Handshake `payload.intentResolverUrl` / `payload.channelSelectorUrl` per FDC3 2.2 */
export type WcpInjectedUiUrl = string | boolean

/** Default for {@link AppConnectionOptions.intentResolutionTimeout}. */
export const DEFAULT_INTENT_RESOLUTION_TIMEOUT_MS = 60_000

/**
 * Configuration options for {@link BrowserAppConnection} (WCP listener + handshake).
 */
export interface AppConnectionOptions {
  /**
   * Static URL for the intent-resolver iframe in WCP3Handshake.
   * Matches FDC3 `payload.intentResolverUrl`: URL string, `false` (host/DA provides UI
   * elsewhere), or `true` (reference FINOS UI). Omitted defaults to `false`.
   *
   * Ignored when {@link getIntentResolverUrl} is set (use the getter for per-instance URLs).
   */
  intentResolverUrl?: WcpInjectedUiUrl

  /**
   * Static URL for the channel-selector iframe in WCP3Handshake.
   * Matches FDC3 `payload.channelSelectorUrl`. Omitted defaults to `false`.
   *
   * Ignored when {@link getChannelSelectorUrl} is set.
   */
  channelSelectorUrl?: WcpInjectedUiUrl

  /**
   * Function to generate intent resolver URL for a given app instance.
   * Return undefined to fall back to `false` in WCP3Handshake.
   *
   * @param instanceId - Temporary or validated instance id at handshake time
   * @returns URL, `false`, `true`, or undefined
   */
  getIntentResolverUrl?: (instanceId: string) => WcpInjectedUiUrl | undefined

  /**
   * Function to generate channel selector URL for a given app instance.
   * Return undefined to fall back to `false` in WCP3Handshake.
   *
   * @param instanceId - Temporary or validated instance id at handshake time
   * @returns URL, `false`, `true`, or undefined
   */
  getChannelSelectorUrl?: (instanceId: string) => WcpInjectedUiUrl | undefined

  /**
   * Timeout for WCP handshake completion (ms).
   * Defaults to 5000ms.
   */
  handshakeTimeout?: number

  /**
   * Grace period for app disconnection after WCP6Goodbye (ms).
   * Allows reconnection during false-positive pagehide events (e.g., tab moves).
   * Defaults to 2000ms.
   */
  disconnectGracePeriod?: number

  /**
   * Timeout for intent resolution UI response (ms).
   * Defaults to {@link DEFAULT_INTENT_RESOLUTION_TIMEOUT_MS}.
   */
  intentResolutionTimeout?: number

  /**
   * Enable debug logging.
   * Defaults to false.
   */
  debug?: boolean

  /**
   * Logger instance for WCP connector operations.
   * OPTIONAL - defaults to consoleLogger if not provided.
   */
  logger?: Logger

  /**
   * Host fallback when the browsing context clears `window.name` before WCP1
   * (common for FINOS conformance mock apps). Map `event.source` to the launcher
   * instance id from {@link AppLauncher.launch}.
   */
  resolveHostIdentifier?: (source: Window) => string | undefined
}

/**
 * Metadata about a connected app instance
 */
export interface AppConnectionMetadata {
  /**
   * Unique instance ID for this app connection
   */
  instanceId: string

  /**
   * App ID from app directory
   */
  appId: string

  /**
   * Connection attempt UUID from WCP1Hello
   */
  connectionAttemptUuid: string

  /**
   * MessageEvent.origin from the original WCP1Hello message
   * Used for WCP4 app identity validation
   */
  messageOrigin: string

  /**
   * Source window/iframe that initiated connection
   */
  source: Window

  /**
   * MessagePort for communication with this app
   */
  port: MessagePort

  /**
   * Timestamp when connection was established
   */
  connectedAt: Date

  /**
   * Host launcher / browsing-context id for this connection.
   * Usually from `window.name` at WCP1; may be filled later via
   * {@link AppConnectionOptions.resolveHostIdentifier} when the app clears `window.name`.
   */
  hostIdentifier?: string
}

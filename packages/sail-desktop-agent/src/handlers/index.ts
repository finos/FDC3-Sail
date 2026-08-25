import { BridgingError, type BrowserTypes } from "@finos/fdc3"

import { DACP_TIMEOUTS } from "../dacp/dacp-constants"
import { DACPProcessingError, DACPTimeoutError } from "../dacp/dacp-errors"
import type { DACPRequestRef } from "../dacp/dacp-message-creators"
import { applyInboundValidationPolicy } from "../dacp/validate-dacp-message"
import type { Logger, LogPayloadDetail } from "../logging/logger"
import { type DACPHandlerParams } from "./types"
import { sendDACPErrorResponse } from "./utils/dacp-response-utils"
import { resolveDacpHandlerInstanceId } from "./utils/resolve-context-listener-instance-id"

// Import all DACP handlers
import * as contextHandlers from "./broadcast/handlers"
import * as intentHandlers from "./intents"
import * as channelHandlers from "./channels/handlers"
import * as eventHandlers from "./events/handlers"
import * as appHandlers from "./open/handlers"
import * as privateChannelHandlers from "./private-channels/handlers"
import * as heartbeatHandlers from "./heartbeat/handlers"

/**
 * Routes DACP messages to appropriate handlers.
 *
 * The single resolution point for the DACP instance id: `inboundContext.instanceId` is whatever
 * the wire said (`meta.source.instanceId`), which can be a MessagePort/temp routing id rather than
 * the registered instance. Not only during the handshake: a `temp-` link is cleared by target, never
 * by key, so it survives for the whole lifetime of the linked instance. Resolving here — and only
 * here — makes `params.instanceId` authoritative for every handler reached **through this router**,
 * which is every inbound app message, so those handlers never choose between raw and resolved.
 *
 * Three entry points deliberately bypass it, which is why this is not done in
 * `createHandlerContext`:
 * - WCP4 identity validation keeps its unresolved `temp-${connectionAttemptUuid}` id.
 * - `cleanupInstanceDacpState` (`instance-teardown.ts`) resolves with its own heartbeat-keyed rule.
 * - `changeAppUserChannel` (`agent/sail-desktop-agent-controllers.ts`) calls the join/leave handlers
 *   directly with a **host-supplied** id — not wire-derived, so it is a separate entry point under
 *   the refactor plan's D1 and stays unresolved. A handler reached that way gets the raw id.
 */
export async function routeDACPMessage(
  message: unknown,
  inboundContext: DACPHandlerParams,
): Promise<void> {
  const params: DACPHandlerParams = {
    ...inboundContext,
    instanceId: resolveDacpHandlerInstanceId(inboundContext),
  }
  const { logger, validation, logPayloadDetail } = params
  try {
    logIncomingDacpMessage(message, logger, logPayloadDetail)
    logger.info("DACP: Routing message", extractDACPMessageLogMetadata(message))

    // Extract message type for routing
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- `message` is the `unknown` parameter at the front door of ALL DACP message routing; the cast is an assumption about a well-formed inbound message, not a guarantee.
    const messageType = (message as { type?: string })?.type

    // Messages reaching this DACP edge may already have been raw-validated and enriched by
    // BrowserAppConnection.enrichMessageWithSource (see wcp-message-routing.ts), which stamps a
    // schema-illegal meta.messageOrigin. Strip only that field before re-validating — meta.source
    // is schema-legal and stays. On the DACP test harness (no enrichment) this is a no-op.
    let messageForValidation = message
    if (typeof message === "object" && message !== null) {
      const meta = (message as { meta?: unknown }).meta
      if (typeof meta === "object" && meta !== null && "messageOrigin" in meta) {
        const { messageOrigin: _messageOrigin, ...restMeta } = meta as Record<string, unknown>
        messageForValidation = { ...(message as Record<string, unknown>), meta: restMeta }
      }
    }
    if (
      applyInboundValidationPolicy(messageForValidation, {
        logger,
        validation,
      }) === "rejected"
    ) {
      if (canSendErrorResponse(message)) {
        sendDACPErrorResponse({
          message,
          errorType: BridgingError.MalformedMessage,
          errorMessage: "Invalid message structure",
          instanceId: params.instanceId,
          responses: params.responses,
        })
      }
      return
    }

    // Get appropriate timeout for message type
    const resolvedMessageType = messageType ?? "unknown"
    const timeout = getTimeoutForMessageType(resolvedMessageType)

    const handler = getHandlerFor(resolvedMessageType)
    if (!handler) {
      logger.warn(`No handler found for DACP message type: ${resolvedMessageType}`)
      return
    }
    await withDACPTimeout(
      Promise.resolve(handler(message, params)),
      timeout,
      `DACP ${resolvedMessageType} handling`,
    )
  } catch (error) {
    const err =
      error instanceof DACPTimeoutError
        ? error
        : new DACPProcessingError("DACP processing failed", { cause: error })
    logger.error("DACP message routing failed:", {
      error: err.message,
      stack: err.stack,
      cause: err.cause,
      messageType:
        typeof message === "object" && message !== null && "type" in message
          ? (message as { type: string }).type
          : "unknown",
      messageData: extractDACPMessageLogMetadata(message),
    })
    if (err instanceof DACPTimeoutError) {
      if (canSendErrorResponse(message)) {
        sendDACPErrorResponse({
          message,
          errorType: BridgingError.ResponseTimedOut,
          errorMessage: "Request timed out",
          instanceId: params.instanceId,
          responses: params.responses,
        })
      }
    } else if (canSendErrorResponse(message)) {
      sendDACPErrorResponse({
        message,
        errorType: BridgingError.MalformedMessage,
        errorMessage: "Message processing failed",
        instanceId: params.instanceId,
        responses: params.responses,
      })
    }
  }
}

/**
 * True when the message has `type` and `meta.requestUuid` — the two fields needed
 * to build a correlated DACP error response. Without them there is nothing to reply to
 * (e.g. events, or junk that never looked like a request).
 */
function canSendErrorResponse(message: unknown): message is DACPRequestRef {
  if (typeof message !== "object" || message === null) {
    return false
  }
  const req = message as { type?: unknown; meta?: { requestUuid?: unknown } }
  return typeof req.type === "string" && typeof req.meta?.requestUuid === "string"
}

/**
 * Message types this router accepts beyond the FDC3 2.2 `AppRequestMessage` schema union.
 *
 * `closeRequest` is an FDC3 3.0 forward-port (see `open/handlers.ts`'s `CloseRequestMessage` and
 * `handleCloseRequest`, which gates it behind `fdc3Version >= "3.0"`). It has no generated 2.2
 * schema validator, so it is also absent from `INBOUND_VALIDATORS` in
 * `dacp/validate-dacp-message.ts` and goes unvalidated even in `strict` mode. Listed here by name
 * so that gap is a documented, visible decision rather than a silent fall-through.
 */
type ExtensionRequestMessage = appHandlers.CloseRequestMessage

/** Every message type this router can dispatch: the 2.2 union plus the extensions above. */
type RoutableRequestMessage = BrowserTypes.AppRequestMessage | ExtensionRequestMessage
type RoutableMessageType = RoutableRequestMessage["type"]

/** Handler for one specific message type, narrowed to that type's own request shape. */
type HandlerFor<MessageType extends RoutableMessageType> = (
  message: Extract<RoutableRequestMessage, { type: MessageType }>,
  params: DACPHandlerParams,
) => void | Promise<void>

/**
 * Erased handler shape used once a handler has been looked up by a runtime (not statically known)
 * message type. `HANDLER_MAP` itself stays precisely typed per key via `HandlerFor`.
 */
type RoutedHandler = (message: unknown, params: DACPHandlerParams) => void | Promise<void>

/**
 * Handler registry - maps message types to handler functions.
 * Module-level so the map is not reallocated on every DACP message.
 *
 * Typed as `{ [MessageType in RoutableMessageType]: HandlerFor<MessageType> }`: every member of
 * `RoutableMessageType` must have an entry (a required handler removed from this object is a
 * compile error), and every key must be a member of `RoutableMessageType` (a typo'd or invented
 * key is a compile error too).
 */
const HANDLER_MAP: { [MessageType in RoutableMessageType]: HandlerFor<MessageType> } = {
  // Context handlers
  broadcastRequest: contextHandlers.handleBroadcastRequest,
  addContextListenerRequest: contextHandlers.handleAddContextListener,
  contextListenerUnsubscribeRequest: contextHandlers.handleContextListenerUnsubscribe,

  // Intent handlers
  raiseIntentRequest: intentHandlers.handleRaiseIntentRequest,
  raiseIntentForContextRequest: intentHandlers.handleRaiseIntentForContextRequest,
  addIntentListenerRequest: intentHandlers.handleAddIntentListener,
  intentListenerUnsubscribeRequest: intentHandlers.handleIntentListenerUnsubscribe,
  findIntentRequest: intentHandlers.handleFindIntentRequest,
  findIntentsByContextRequest: intentHandlers.handleFindIntentsByContextRequest,
  intentResultRequest: intentHandlers.handleIntentResultRequest,

  // Channel handlers
  getCurrentChannelRequest: channelHandlers.handleGetCurrentChannelRequest,
  getCurrentContextRequest: channelHandlers.handleGetCurrentContextRequest,
  joinUserChannelRequest: channelHandlers.handleJoinUserChannelRequest,
  leaveCurrentChannelRequest: channelHandlers.handleLeaveCurrentChannelRequest,
  getUserChannelsRequest: channelHandlers.handleGetUserChannelsRequest,
  getOrCreateChannelRequest: channelHandlers.handleGetOrCreateChannelRequest,

  // App management handlers
  getInfoRequest: appHandlers.handleGetInfoRequest,
  openRequest: appHandlers.handleOpenRequest,
  closeRequest: appHandlers.handleCloseRequest,
  findInstancesRequest: appHandlers.handleFindInstancesRequest,
  getAppMetadataRequest: appHandlers.handleGetAppMetadataRequest,

  // Event handlers
  addEventListenerRequest: eventHandlers.handleAddEventListenerRequest,
  eventListenerUnsubscribeRequest: eventHandlers.handleEventListenerUnsubscribeRequest,

  // Private channel handlers
  createPrivateChannelRequest: privateChannelHandlers.handleCreatePrivateChannelRequest,
  privateChannelDisconnectRequest: privateChannelHandlers.handlePrivateChannelDisconnectRequest,
  privateChannelAddEventListenerRequest:
    privateChannelHandlers.handlePrivateChannelAddContextListenerRequest,
  privateChannelUnsubscribeEventListenerRequest:
    privateChannelHandlers.handlePrivateChannelUnsubscribeEventListenerRequest,

  // Heartbeat handlers
  heartbeatAcknowledgementRequest: heartbeatHandlers.handleHeartbeatAcknowledgmentRequest,
}

/** Look up {@link HANDLER_MAP} by runtime `type`; result is {@link RoutedHandler} (wire key is not a literal). */
function getHandlerFor(messageType: string): RoutedHandler | undefined {
  if (!Object.hasOwn(HANDLER_MAP, messageType)) {
    return undefined
  }
  return HANDLER_MAP[messageType as RoutableMessageType] as RoutedHandler
}

// ---------------------------------------------------------------------------
// Router helpers (timeout, logging) — only used by routeDACPMessage
// ---------------------------------------------------------------------------

/**
 * Get appropriate timeout for message type
 */
function getTimeoutForMessageType(messageType: string): number {
  // App launch operations get longer timeout
  const appLaunchMessages = [
    "openRequest",
    "raiseIntentRequest",
    "raiseIntentForContextRequest",
    "findInstancesRequest",
  ]

  if (appLaunchMessages.includes(messageType)) {
    return DACP_TIMEOUTS.APP_LAUNCH
  }

  // Default timeout for other operations
  return DACP_TIMEOUTS.DEFAULT
}

/**
 * Wraps a promise with a timeout, rejecting with DACPTimeoutError if exceeded.
 */
async function withDACPTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DACP_TIMEOUTS.DEFAULT,
  operation: string = "DACP operation",
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new DACPTimeoutError(`${operation} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle)
    }
  }
}

/**
 * Build metadata-only fields for structured DACP logs (no sensitive context values).
 */
function extractDACPMessageLogMetadata(message: unknown): Record<string, unknown> {
  if (typeof message !== "object" || message === null) {
    return { messageFormat: typeof message }
  }

  const msg = message as Record<string, unknown>
  const meta = msg.meta as Record<string, unknown> | undefined
  const payload = msg.payload as Record<string, unknown> | undefined
  const context = payload?.context as Record<string, unknown> | undefined

  const metadata: Record<string, unknown> = {
    type: msg.type,
    requestUuid: meta?.requestUuid,
    eventUuid: meta?.eventUuid,
  }

  if (payload?.channelId !== undefined) {
    metadata.channelId = payload.channelId
  }

  if (context) {
    metadata.contextType = context.type
    metadata.contextKeys = Object.keys(context)
  }

  return metadata
}

/**
 * Metadata-only at info/warn/error; full payloads only on {@link Logger.debug}
 * when `logPayloadDetail` is `'full'`.
 */
function logIncomingDacpMessage(
  message: unknown,
  logger: Logger,
  logPayloadDetail: LogPayloadDetail,
): void {
  try {
    if (typeof message === "object" && message !== null) {
      const metadata = extractDACPMessageLogMetadata(message)
      logger.debug("[DACP INCOMING]", { ...metadata, source: "DACP Router" })

      if (logPayloadDetail === "full") {
        logger.debug("[DACP INCOMING full payload]", {
          source: "DACP Router",
          fullMessage: JSON.stringify(message),
        })
      }
    } else {
      logger.warn("[DACP INVALID INCOMING]", {
        message: "Invalid message format",
        source: "DACP Router",
      })
    }
  } catch (error) {
    logger.error(`[DACP LOG ERROR]`, error)
  }
}

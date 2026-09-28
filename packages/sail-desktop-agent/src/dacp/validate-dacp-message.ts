/**
 * Inbound DACP/WCP message validation.
 *
 * Validators come from `@finos/fdc3-schema` — the same generated source as the
 * `BrowserTypes` the agent already types against — so the check can never drift
 * from the FDC3 version this package targets.
 *
 * Only messages an app can send inbound are validated. Responses and events the
 * agent itself produces are not re-checked on the way out.
 */

import {
  isValidAddContextListenerRequest,
  isValidAddEventListenerRequest,
  isValidAddIntentListenerRequest,
  isValidBroadcastRequest,
  isValidContextListenerUnsubscribeRequest,
  isValidCreatePrivateChannelRequest,
  isValidEventListenerUnsubscribeRequest,
  isValidFindInstancesRequest,
  isValidFindIntentRequest,
  isValidFindIntentsByContextRequest,
  isValidGetAppMetadataRequest,
  isValidGetCurrentChannelRequest,
  isValidGetCurrentContextRequest,
  isValidGetInfoRequest,
  isValidGetOrCreateChannelRequest,
  isValidGetUserChannelsRequest,
  isValidHeartbeatAcknowledgementRequest,
  isValidIntentListenerUnsubscribeRequest,
  isValidIntentResultRequest,
  isValidJoinUserChannelRequest,
  isValidLeaveCurrentChannelRequest,
  isValidOpenRequest,
  isValidPrivateChannelAddEventListenerRequest,
  isValidPrivateChannelDisconnectRequest,
  isValidPrivateChannelUnsubscribeEventListenerRequest,
  isValidRaiseIntentForContextRequest,
  isValidRaiseIntentRequest,
  isValidWebConnectionProtocol4ValidateAppIdentity,
  isValidWebConnectionProtocol6Goodbye,
} from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import type { Logger } from "../logging/logger"

/**
 * How the agent treats a message that fails FDC3 schema validation.
 *
 * - `off` — no validation
 * - `warn` — log the failure, dispatch anyway (default)
 * - `strict` — reject the message and return an FDC3 `MalformedMessage` error
 *
 * `warn` is the default because rejecting is a behaviour change: a client library
 * sending a slightly off-spec shape works today, and `strict` would break it. Warn
 * surfaces the problem first.
 */
export type ValidationMode = "off" | "warn" | "strict"

type SchemaValidator = (value: unknown) => boolean

/** Inbound message types an app can send, mapped to their FDC3 schema validators. */
const INBOUND_VALIDATORS: Record<string, SchemaValidator> = {
  addContextListenerRequest: isValidAddContextListenerRequest,
  addEventListenerRequest: isValidAddEventListenerRequest,
  addIntentListenerRequest: isValidAddIntentListenerRequest,
  broadcastRequest: isValidBroadcastRequest,
  contextListenerUnsubscribeRequest: isValidContextListenerUnsubscribeRequest,
  createPrivateChannelRequest: isValidCreatePrivateChannelRequest,
  eventListenerUnsubscribeRequest: isValidEventListenerUnsubscribeRequest,
  findInstancesRequest: isValidFindInstancesRequest,
  findIntentRequest: isValidFindIntentRequest,
  findIntentsByContextRequest: isValidFindIntentsByContextRequest,
  getAppMetadataRequest: isValidGetAppMetadataRequest,
  getCurrentChannelRequest: isValidGetCurrentChannelRequest,
  getCurrentContextRequest: isValidGetCurrentContextRequest,
  getInfoRequest: isValidGetInfoRequest,
  getOrCreateChannelRequest: isValidGetOrCreateChannelRequest,
  getUserChannelsRequest: isValidGetUserChannelsRequest,
  heartbeatAcknowledgementRequest: isValidHeartbeatAcknowledgementRequest,
  intentListenerUnsubscribeRequest: isValidIntentListenerUnsubscribeRequest,
  intentResultRequest: isValidIntentResultRequest,
  joinUserChannelRequest: isValidJoinUserChannelRequest,
  leaveCurrentChannelRequest: isValidLeaveCurrentChannelRequest,
  openRequest: isValidOpenRequest,
  privateChannelAddEventListenerRequest: isValidPrivateChannelAddEventListenerRequest,
  privateChannelDisconnectRequest: isValidPrivateChannelDisconnectRequest,
  privateChannelUnsubscribeEventListenerRequest:
    isValidPrivateChannelUnsubscribeEventListenerRequest,
  raiseIntentForContextRequest: isValidRaiseIntentForContextRequest,
  raiseIntentRequest: isValidRaiseIntentRequest,
  WCP4ValidateAppIdentity: isValidWebConnectionProtocol4ValidateAppIdentity,
  WCP6Goodbye: isValidWebConnectionProtocol6Goodbye,
}

/**
 * Check an inbound message against its FDC3 schema.
 *
 * @returns `true` when the message is valid **or** when its type has no inbound
 * schema — unknown types are the router's concern, not the validator's.
 */
export function isValidInboundMessage(messageType: string, message: unknown): boolean {
  const validate = INBOUND_VALIDATORS[messageType]
  if (!validate) {
    return true
  }

  try {
    return validate(message)
  } catch {
    // Generated validators throw on structurally unexpected input rather than
    // returning false. Treat a throw as a validation failure, not a crash.
    return false
  }
}

/**
 * Shared inbound validation gate for DACP routing and WCP MessagePort ingest.
 *
 * Call on the **raw** app message (before Sail enrichment). Returns `"rejected"`
 * only in `strict` mode when the schema check fails.
 */
export function applyInboundValidationPolicy(
  message: unknown,
  options: {
    logger: Pick<Logger, "error" | "warn">
    validation?: ValidationMode
  },
): "dispatch" | "rejected" {
  const resolvedValidation = options.validation ?? "warn"
  const messageType =
    message && typeof message === "object" && "type" in message
      ? (message as { type?: string }).type
      : undefined

  if (resolvedValidation === "off" || !messageType) {
    return "dispatch"
  }

  if (!isValidInboundMessage(messageType, message)) {
    if (resolvedValidation === "strict") {
      options.logger.error("DACP message failed FDC3 schema validation — rejected", { messageType })
      return "rejected"
    }

    options.logger.warn("DACP message failed FDC3 schema validation — dispatching anyway", {
      messageType,
    })
  }

  return "dispatch"
}

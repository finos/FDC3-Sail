/**
 * Inbound DACP/WCP message validation (FDC3 schema).
 * Used by the browser MessagePort edge before enrichment.
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

export type ValidationMode = "off" | "warn" | "strict"

type SchemaValidator = (value: unknown) => boolean

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

export function isValidInboundMessage(messageType: string, message: unknown): boolean {
  const validate = INBOUND_VALIDATORS[messageType]
  if (!validate) {
    return true
  }
  try {
    return validate(message)
  } catch {
    return false
  }
}

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

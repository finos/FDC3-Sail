import type { BrowserTypes } from "@finos/fdc3"
import { createDACPErrorResponse, type DACPRequestRef } from "../../dacp/dacp-message-creators"
import type { DacpOutboundMessage, DacpResponseDispatcher } from "../types"

/**
 * Options for sending a DACP response
 */
export interface SendDACPResponseOptions {
  /** The DACP response message to send */
  response: BrowserTypes.AgentResponseMessage | BrowserTypes.WebConnectionProtocolMessage
  /** The target instance ID for routing */
  instanceId: string
  /** Response delivery for the connected app edge */
  responses: DacpResponseDispatcher
}

/**
 * Adds routing metadata to a DACP response and sends it via the dispatcher.
 */
export function sendDACPResponse(options: SendDACPResponseOptions): void {
  options.responses.sendToInstance(options.instanceId, options.response)
}

/**
 * Options for sending a DACP error response
 */
export interface SendDACPErrorResponseOptions {
  /** Original request message (must have type and meta.requestUuid) */
  message: DACPRequestRef
  /** FDC3 response payload error (use OpenError, ResolveError, ChannelError, ResultError, BridgingError from @finos/fdc3) */
  errorType: BrowserTypes.ResponsePayloadError
  /** Human-readable error message */
  errorMessage: string
  /** The target instance ID for routing */
  instanceId: string
  /** Response delivery for the connected app edge */
  responses: DacpResponseDispatcher
}

/**
 * Derives response type from request type.
 * Converts "addEventListenerRequest" → "addEventListenerResponse"
 */
function deriveResponseType(requestType: string): string {
  if (requestType.endsWith("Request")) {
    return requestType.replace("Request", "Response")
  }
  return requestType
}

/**
 * Creates and sends a DACP error response with routing metadata.
 */
export function sendDACPErrorResponse(options: SendDACPErrorResponseOptions): void {
  const { message, errorType, errorMessage, instanceId, responses } = options
  const responseType = deriveResponseType(message.type) as BrowserTypes.ResponseMessageType
  const errorResponse = createDACPErrorResponse(message, errorType, responseType, errorMessage)
  sendDACPResponse({ response: errorResponse, instanceId, responses })
}

/** @internal Exported for the test-only dispatcher in `test/support/transport.ts`. */
export function withDestinationRouting(instanceId: string, message: DacpOutboundMessage): unknown {
  return {
    ...message,
    meta: {
      ...message.meta,
      destination: { instanceId },
    },
  }
}

/**
 * DACP response delivery via browser app connection (instanceId → MessagePort).
 */
export function createDacpResponseDispatcherFromDelivery(
  connectionOwner: object,
  sendToAppInstance: (message: unknown) => void,
): DacpResponseDispatcher {
  return {
    connectionOwner,

    sendToInstance(instanceId, message) {
      sendToAppInstance(withDestinationRouting(instanceId, message))
    },

    sendOutbound(message) {
      sendToAppInstance(message)
    },

    getInboundInstanceId() {
      return null
    },
  }
}

import { createDACPSuccessResponse } from "../../dacp/dacp-message-creators"
import { type DACPHandlerParams } from "../types"
import { sendDACPResponse, sendDACPErrorResponse } from "../utils/dacp-response-utils"
import type { BrowserTypes } from "@finos/fdc3"
import { ChannelError } from "@finos/fdc3"
import { FDC3ChannelError } from "../../errors/fdc3-errors"
import { getInstance, getEventListenersForType } from "../../state/selectors"
import {
  addEventListener,
  removeEventListener,
  removeEventListenersForInstance,
} from "../../state/mutators"
import type { AgentState } from "../../state/types"

/** Sentinel event type: when addEventListener(type: null) is used, subscribe to all DA-level events (FDC3 2.2) */
export const ALL_DA_EVENT_TYPES = "all"

/**
 * Handles addEventListenerRequest for DA-level events
 */
export function handleAddEventListenerRequest(
  message: BrowserTypes.AddEventListenerRequest,
  params: DACPHandlerParams,
): void {
  const { responses, instanceId, getState, setState, logger } = params

  try {
    const instance = getInstance(getState(), instanceId)

    if (!instance) {
      throw new FDC3ChannelError(
        ChannelError.InvalidArguments,
        `Instance ${instanceId} not found for adding event listener`,
      )
    }

    const { type: eventType } = message.payload

    // FDC3 2.2: null/undefined type means subscribe to all DA-level events
    // Only the schema's closed union is accepted: "USER_CHANNEL_CHANGED" | null
    const validEventTypes = ["USER_CHANNEL_CHANGED"]
    let normalizedEventType: string
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- `eventType` is parsed from an inbound DACP addEventListenerRequest message; the schema type is an assumption about a well-behaved peer, not a guarantee.
    if (eventType === null || eventType === undefined) {
      normalizedEventType = ALL_DA_EVENT_TYPES
    } else if (validEventTypes.includes(eventType)) {
      // Internal listener-map key (not a wire value)
      normalizedEventType = "channelChanged"
    } else {
      throw new FDC3ChannelError(
        ChannelError.InvalidArguments,
        `Unsupported event type: ${eventType}`,
      )
    }

    const listenerId = message.meta.requestUuid

    setState(state =>
      addEventListener(state, {
        listenerId,
        instanceId,
        eventType: normalizedEventType,
      }),
    )

    // FDC3 spec requires listenerUUID (not listenerId) in the response payload
    const response = createDACPSuccessResponse(message, "addEventListenerResponse", {
      listenerUUID: listenerId,
    })

    sendDACPResponse({ response, instanceId, responses })

    logger.info("DACP: Event listener added", {
      instanceId,
      eventType: normalizedEventType,
      listenerId,
    })
  } catch (error) {
    logger.error("DACP: Add event listener failed", error)

    const errorType =
      error instanceof FDC3ChannelError ? error.errorType : ChannelError.InvalidArguments
    const errorMessage = error instanceof Error ? error.message : "Failed to add event listener"

    sendDACPErrorResponse({
      message,
      errorType,
      errorMessage,
      instanceId,
      responses,
    })
  }
}

/**
 * Handles eventListenerUnsubscribeRequest
 */
export function handleEventListenerUnsubscribeRequest(
  message: BrowserTypes.EventListenerUnsubscribeRequest,
  params: DACPHandlerParams,
): void {
  const { responses, instanceId, getState, setState, logger } = params

  try {
    const { listenerUUID } = message.payload

    // Check if listener exists before removing
    const listener = getState().events.listeners[listenerUUID]
    if (!listener || listener.instanceId !== instanceId) {
      throw new FDC3ChannelError(
        ChannelError.InvalidArguments,
        `Event listener ${listenerUUID} not found`,
      )
    }

    setState(state => removeEventListener(state, listenerUUID))

    const response = createDACPSuccessResponse(message, "eventListenerUnsubscribeResponse")

    sendDACPResponse({ response, instanceId, responses })

    logger.info("DACP: Event listener unsubscribed", { instanceId, listenerUUID })
  } catch (error) {
    logger.error("DACP: Event listener unsubscribe failed", error)

    const errorType =
      error instanceof FDC3ChannelError ? error.errorType : ChannelError.InvalidArguments
    const errorMessage =
      error instanceof Error ? error.message : "Failed to unsubscribe event listener"

    sendDACPErrorResponse({
      message,
      errorType,
      errorMessage,
      instanceId,
      responses,
    })
  }
}

/**
 * Get listeners for an event type (exported for use by other handlers)
 * Note: This function now requires state to be passed in
 */
export function getEventListeners(eventType: string, getState: () => AgentState): string[] {
  return getEventListenersForType(getState(), eventType)
}

/**
 * Remove all event listeners for an instance (called on disconnect)
 */
export function removeInstanceEventListeners(
  instanceId: string,
  setState: (fn: (state: AgentState) => AgentState) => void,
): void {
  setState(state => removeEventListenersForInstance(state, instanceId))
}

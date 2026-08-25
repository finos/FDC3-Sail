import { ResolveError, ResultError } from "@finos/fdc3"
import {
  createDACPErrorResponse,
  createDACPSuccessResponse,
  createIntentEvent,
} from "../../dacp/dacp-message-creators"
import { sendDACPResponse } from "../utils/dacp-response-utils"
import {
  getInstance,
  getListenersForInstance,
  getPendingIntent,
  isInstanceReceivable,
} from "../../state/selectors"
import {
  markPendingIntentDelivered,
  resolvePendingIntent,
  updatePendingIntentTarget,
} from "../../state/mutators"
import type { DACPHandlerParams } from "../types"
import type { IntentRequestType, PendingIntent } from "../../state/types"
import {
  extractAppProvidedIntentContextMetadata,
  mergeIntentEventContextMetadata,
} from "./intent-result-metadata"
import {
  clearPendingIntentTimeout,
  registerPendingIntentTimeout,
  releasePendingIntentTimeout,
} from "./intent-pending-timeout-registry"

type IntentResponseType = "raiseIntentResponse" | "raiseIntentForContextResponse"

function getResponseTypeForRequest(requestType: IntentRequestType): IntentResponseType {
  return requestType === "raiseIntentForContextRequest"
    ? "raiseIntentForContextResponse"
    : "raiseIntentResponse"
}

/**
 * Sends the terminal response for a pending intent that will never be delivered.
 *
 * Which response settles the raiser depends on how far the intent got, and `delivered` is the
 * discriminator:
 *
 * - **Before delivery** the raiser is still awaiting the raise-stage response
 *   (`raiseIntentResponse` / `raiseIntentForContextResponse`). There is no `IntentResolution`
 *   yet, so a `raiseIntentResultResponse` settles nothing and `raiseIntent()` hangs. The spec's
 *   error for this is `ResolveError.IntentDeliveryFailed`.
 * - **After delivery** the raise stage has already been answered, and only
 *   `IntentResolution.getResult()` is outstanding — so the result stage is the terminal one.
 *
 * Callers are responsible for clearing timers and resolving the pending entry from state; this
 * only puts the right message on the wire.
 */
export function sendTerminalPendingIntentResponse(
  params: DACPHandlerParams,
  pendingIntent: PendingIntent,
  errorMessage: string,
): void {
  const { requestId, sourceInstanceId } = pendingIntent
  const requestType = pendingIntent.requestType ?? "raiseIntentRequest"

  const response = pendingIntent.delivered
    ? createDACPErrorResponse(
        { type: requestType, meta: { requestUuid: requestId } },
        ResultError.ApiTimeout,
        "raiseIntentResultResponse",
        errorMessage,
      )
    : createDACPErrorResponse(
        { type: requestType, meta: { requestUuid: requestId } },
        ResolveError.IntentDeliveryFailed,
        getResponseTypeForRequest(requestType),
        errorMessage,
      )

  sendDACPResponse({ response, instanceId: sourceInstanceId, responses: params.responses })
}

export function isIntentListenerReady(
  params: DACPHandlerParams,
  instanceId: string,
  intentName: string,
): boolean {
  const listeners = getListenersForInstance(params.getState(), instanceId).filter(
    listener => listener.intentName === intentName && listener.active,
  )
  return listeners.length > 0
}

export function attemptIntentDelivery(
  params: DACPHandlerParams,
  requestId: string,
  requireListener: boolean,
): boolean {
  const { getState, responses, logger } = params
  const pendingIntent = getPendingIntent(getState(), requestId)
  if (!pendingIntent) {
    return true
  }

  if (pendingIntent.delivered) {
    return true
  }

  if (
    requireListener &&
    !isIntentListenerReady(params, pendingIntent.targetInstanceId, pendingIntent.intentName)
  ) {
    return false
  }

  const sourceInstance = getInstance(getState(), pendingIntent.sourceInstanceId)
  if (!sourceInstance) {
    logger.warn("DACP: Source instance not found for pending intent delivery", {
      requestId,
      sourceInstanceId: pendingIntent.sourceInstanceId,
    })
    return true
  }

  const targetInstance = getInstance(getState(), pendingIntent.targetInstanceId)
  if (!targetInstance || !isInstanceReceivable(targetInstance)) {
    logger.warn("DACP: Target instance not ready for pending intent delivery", {
      requestId,
      targetInstanceId: pendingIntent.targetInstanceId,
    })
    return false
  }

  const intentEvent = createIntentEvent(
    pendingIntent.intentName,
    pendingIntent.context,
    requestId,
    {
      appId: sourceInstance.appId,
      instanceId: sourceInstance.instanceId,
    },
  )

  const appContextMetadata = extractAppProvidedIntentContextMetadata(pendingIntent.context)
  const intentEventPayload = intentEvent.payload as typeof intentEvent.payload & {
    metadata: Parameters<typeof mergeIntentEventContextMetadata>[0]
  }
  const payloadWithMergedMetadata = {
    ...intentEventPayload,
    metadata: mergeIntentEventContextMetadata(intentEventPayload.metadata, appContextMetadata),
  }

  responses.sendOutbound({
    ...intentEvent,
    payload: payloadWithMergedMetadata,
    meta: {
      ...intentEvent.meta,
      destination: { instanceId: pendingIntent.targetInstanceId },
    },
  })

  const requestType = pendingIntent.requestType ?? "raiseIntentRequest"
  const response = createDACPSuccessResponse(
    { type: requestType, meta: { requestUuid: requestId } },
    getResponseTypeForRequest(requestType),
    {
      intentResolution: {
        source: {
          appId: pendingIntent.targetAppId,
          instanceId: pendingIntent.targetInstanceId,
        },
        intent: pendingIntent.intentName,
      },
    },
  )

  sendDACPResponse({ response, instanceId: pendingIntent.sourceInstanceId, responses })

  clearPendingIntentTimeout(requestId, "delivery")
  params.setState(state => markPendingIntentDelivered(state, requestId))

  return true
}

export function queueIntentDelivery(
  params: DACPHandlerParams,
  requestId: string,
  requireListener: boolean,
): void {
  if (!getPendingIntent(params.getState(), requestId)) {
    return
  }

  const delivered = attemptIntentDelivery(params, requestId, requireListener)
  if (delivered) {
    return
  }

  const timeoutHandle = setTimeout(() => {
    releasePendingIntentTimeout(requestId, "delivery")

    // `requestType` now comes off the state entry, so the lookup must come first. Safe: the
    // response was only ever sent inside the `if (pendingIntent)` guard anyway.
    const pendingIntent = getPendingIntent(params.getState(), requestId)
    if (!pendingIntent || pendingIntent.delivered) {
      return
    }

    sendTerminalPendingIntentResponse(
      params,
      pendingIntent,
      "Intent listener not registered within timeout",
    )
    params.setState(state => resolvePendingIntent(state, requestId))
  }, params.openContextListenerTimeoutMs)
  registerPendingIntentTimeout(requestId, "delivery", timeoutHandle)
}

export function deliverPendingIntentsForListener(
  params: DACPHandlerParams,
  intentName: string,
): void {
  const listenerInstance = getInstance(params.getState(), params.instanceId)
  if (!listenerInstance) {
    return
  }

  const pendingIntents = Object.values(params.getState().intents.pending).filter(
    pending => pending.targetAppId === listenerInstance.appId && pending.intentName === intentName,
  )

  pendingIntents.forEach(pending => {
    if (pending.delivered) {
      return
    }

    if (pending.targetInstanceId !== params.instanceId) {
      params.setState(state =>
        updatePendingIntentTarget(
          state,
          pending.requestId,
          params.instanceId,
          listenerInstance.appId,
        ),
      )
    }
    attemptIntentDelivery(params, pending.requestId, true)
  })
}

/**
 * Intent Result Handlers
 *
 * Handlers for processing intent results. When the handler returns nothing
 * (intentResult null) or signals rejection (intentResult.error), the DA sends
 * raiseIntentResultResponse with ResultError so IntentResolution.getResult() rejects.
 */

import {
  createDACPSuccessResponse,
  createDACPErrorResponse,
} from "../../dacp/dacp-message-creators"
import { type DACPHandlerParams } from "../types"
import { sendDACPResponse, sendDACPErrorResponse } from "../utils/dacp-response-utils"
import type { BrowserTypes } from "@finos/fdc3"
import { ResultError, ResolveError } from "@finos/fdc3"
import { getInstance, getPendingIntent, getPrivateChannel } from "../../state/selectors"
import { connectInstanceToPrivateChannel, resolvePendingIntent } from "../../state/mutators"
import {
  buildIntentResultWirePayload,
  attachIntentResultClientMetadata,
  cloneIntentResultContextMetadata,
} from "./intent-result-metadata"
import { clearPendingIntentTimeouts } from "./intent-pending-timeout-registry"

function isHandlerRejection(intentResult: unknown): boolean {
  return (
    typeof intentResult === "object" &&
    intentResult !== null &&
    "error" in intentResult &&
    (intentResult as { error: string }).error === "IntentHandlerRejected"
  )
}

/** Grant the intent raiser access when a PrivateChannel is returned as the result. */
function grantPrivateChannelToIntentSource(
  intentResult: unknown,
  sourceInstanceId: string,
  setState: DACPHandlerParams["setState"],
  getState: DACPHandlerParams["getState"],
  logger: DACPHandlerParams["logger"],
): void {
  if (typeof intentResult !== "object" || intentResult === null || !("channel" in intentResult)) {
    return
  }
  const channel = (intentResult as { channel?: { id?: string; type?: string } }).channel
  if (!channel || channel.type !== "private" || typeof channel.id !== "string") {
    return
  }
  const channelId = channel.id
  if (!getPrivateChannel(getState(), channelId)) {
    logger.warn("DACP: Private channel intent result references unknown channel", {
      channelId,
      sourceInstanceId,
    })
    return
  }
  setState(state => connectInstanceToPrivateChannel(state, channelId, sourceInstanceId))
}

export function handleIntentResultRequest(
  message: BrowserTypes.IntentResultRequest,
  params: DACPHandlerParams,
): void {
  const { responses, instanceId, getState, setState, logger } = params

  try {
    const payload = message.payload

    logger.info("DACP: Processing intent result request", {
      requestUuid: message.meta.requestUuid,
      raiseIntentRequestUuid: payload.raiseIntentRequestUuid,
    })

    const originalRequestId = payload.raiseIntentRequestUuid
    const state = getState()
    const pendingIntent = getPendingIntent(state, originalRequestId)

    if (!pendingIntent) {
      throw new Error(`No pending intent found for request: ${originalRequestId}`)
    }

    if (pendingIntent.targetInstanceId !== instanceId) {
      throw new Error(
        `Intent result from wrong instance. Expected ${pendingIntent.targetInstanceId}, got ${instanceId}`,
      )
    }

    const intentResult = payload.intentResult
    const sourceInstanceId = pendingIntent.sourceInstanceId
    const resultTimestamp = new Date().toISOString()

    clearPendingIntentTimeouts(originalRequestId)

    setState(state => resolvePendingIntent(state, originalRequestId))

    // oxlint-disable-next-line typescript/no-unnecessary-condition -- intentResult is null on the FDC3 wire even though BrowserTypes.IntentResult types it non-nullable; see the passing NoResultReturned Cucumber scenario at test/features/intents/intent-result.feature:61.
    if (intentResult !== null && !isHandlerRejection(intentResult)) {
      grantPrivateChannelToIntentSource(intentResult, sourceInstanceId, setState, getState, logger)
    }

    const response = createDACPSuccessResponse(message, "intentResultResponse")
    sendDACPResponse({ response, instanceId, responses })

    const sourceInstance = getInstance(getState(), sourceInstanceId)
    if (!sourceInstance) {
      logger.warn("DACP: Source instance not found for intent result delivery", {
        originalRequestId,
        sourceInstanceId,
      })
      return
    }

    const raiseIntentRequestLike = {
      type: "raiseIntentRequest" as const,
      meta: { requestUuid: originalRequestId },
    }

    // oxlint-disable-next-line typescript/no-unnecessary-condition -- intentResult is null on the FDC3 wire even though BrowserTypes.IntentResult types it non-nullable; see the passing NoResultReturned Cucumber scenario at test/features/intents/intent-result.feature:61.
    if (intentResult === null) {
      const resultErrorResponse = createDACPErrorResponse(
        raiseIntentRequestLike,
        ResultError.NoResultReturned,
        "raiseIntentResultResponse",
      )
      sendDACPResponse({
        response: resultErrorResponse,
        instanceId: sourceInstanceId,
        responses,
      })
    } else if (isHandlerRejection(intentResult)) {
      const resultErrorResponse = createDACPErrorResponse(
        raiseIntentRequestLike,
        ResultError.IntentHandlerRejected,
        "raiseIntentResultResponse",
      )
      sendDACPResponse({
        response: resultErrorResponse,
        instanceId: sourceInstanceId,
        responses,
      })
    } else {
      const { wireIntentResult, resultMetadata, isContextWithMetadata } =
        buildIntentResultWirePayload(
          intentResult,
          pendingIntent.targetAppId,
          pendingIntent.targetInstanceId,
          resultTimestamp,
        )
      const payloadMetadata = resultMetadata
      const clientMetadata = cloneIntentResultContextMetadata(payloadMetadata)

      const intentResultForClient = attachIntentResultClientMetadata(
        wireIntentResult,
        clientMetadata,
        isContextWithMetadata,
      )

      const resultResponse = createDACPSuccessResponse(
        raiseIntentRequestLike,
        "raiseIntentResultResponse",
        {
          intentResult: intentResultForClient,
          resultMetadata: payloadMetadata,
        },
      )
      sendDACPResponse({
        response: resultResponse,
        instanceId: sourceInstanceId,
        responses,
      })
    }

    logger.info("DACP: Intent result processed successfully", {
      originalRequestId,
      hasResult: !!intentResult,
    })
  } catch (error) {
    logger.error("DACP: Intent result request failed", error)
    sendDACPErrorResponse({
      message,
      errorType: ResolveError.IntentDeliveryFailed,
      errorMessage: error instanceof Error ? error.message : "Failed to process intent result",
      instanceId,
      responses,
    })
  }
}

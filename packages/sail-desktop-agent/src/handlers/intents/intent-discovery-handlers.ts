/**
 * Intent Discovery Handlers
 *
 * Handlers for finding intents and apps that handle intents
 */

import { createDACPSuccessResponse } from "../../dacp/dacp-message-creators"
import { type DACPHandlerParams } from "../types"
import { sendDACPResponse, sendDACPErrorResponse } from "../utils/dacp-response-utils"
import type { BrowserTypes } from "@finos/fdc3"
import { ResolveError } from "@finos/fdc3"
import { createAppIntents, findIntentsByContext } from "./intent-helpers"
import { isValidContext } from "../utils/context-validation"

export function handleFindIntentRequest(
  message: BrowserTypes.FindIntentRequest,
  params: DACPHandlerParams,
): void {
  const { responses, instanceId, getState, logger } = params

  try {
    const payload = message.payload
    if (payload.context !== undefined && !isValidContext(payload.context)) {
      sendDACPErrorResponse({
        message,
        errorType: ResolveError.MalformedContext,
        errorMessage: "Invalid context: context must be an object with a string type property",
        instanceId,
        responses,
      })
      return
    }
    const intent = payload.intent
    const contextType = payload.context?.type
    const resultType = payload.resultType

    const appIntents = createAppIntents(
      getState(),
      getState().appDirectory,
      intent,
      contextType,
      resultType,
    )

    if (appIntents.length === 0) {
      throw new Error(`No apps found to handle intent: ${intent}`)
    }

    const response = createDACPSuccessResponse(message, "findIntentResponse", {
      appIntent: appIntents[0],
    })

    sendDACPResponse({ response, instanceId, responses })
  } catch (error) {
    logger.error("DACP: Find intent request failed", error)
    sendDACPErrorResponse({
      message,
      errorType: ResolveError.NoAppsFound,
      errorMessage: error instanceof Error ? error.message : "Failed to find apps for intent",
      instanceId,
      responses,
    })
  }
}

export function handleFindIntentsByContextRequest(
  message: BrowserTypes.FindIntentsByContextRequest,
  params: DACPHandlerParams,
): void {
  const { responses, instanceId, getState, logger } = params

  try {
    const payload = message.payload
    if (!isValidContext(payload.context)) {
      sendDACPErrorResponse({
        message,
        errorType: ResolveError.MalformedContext,
        errorMessage: "Invalid context: context must be an object with a string type property",
        instanceId,
        responses,
      })
      return
    }
    const contextType = payload.context.type
    const resultType = payload.resultType ?? undefined

    logger.info("DACP: Finding intents for context type", { contextType, resultType })

    // Find all intents that can handle this context type
    const intentMetadata = findIntentsByContext(getState(), getState().appDirectory, contextType)

    // Convert to AppIntent[] format, applying resultType filter via createAppIntents
    const appIntents = intentMetadata
      .map(
        metadata =>
          createAppIntents(
            getState(),
            getState().appDirectory,
            metadata.name,
            contextType,
            resultType,
          )[0],
      )
      .filter((appIntent): appIntent is NonNullable<typeof appIntent> => !!appIntent)
      .filter(appIntent => appIntent.apps.length > 0)

    if (appIntents.length === 0) {
      throw new Error(`No apps found to handle context type: ${contextType}`)
    }

    const response = createDACPSuccessResponse(message, "findIntentsByContextResponse", {
      appIntents,
    })

    sendDACPResponse({ response, instanceId, responses })
  } catch (error) {
    logger.error("DACP: Find intents by context request failed", error)
    sendDACPErrorResponse({
      message,
      errorType: ResolveError.NoAppsFound,
      errorMessage:
        error instanceof Error ? error.message : "Failed to find intents for context type",
      instanceId,
      responses,
    })
  }
}

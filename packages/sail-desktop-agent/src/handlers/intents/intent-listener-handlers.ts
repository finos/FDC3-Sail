/**
 * Intent Listener Handlers
 *
 * Handlers for adding and removing intent listeners
 */

import { createDACPSuccessResponse } from "../../dacp/dacp-message-creators"
import { type DACPHandlerParams } from "../types"
import { sendDACPResponse, sendDACPErrorResponse } from "../utils/dacp-response-utils"
import type { BrowserTypes } from "@finos/fdc3"
import { ResolveError } from "@finos/fdc3"
import {
  FDC3ResolveError,
  IntentListenerConflictError,
  TargetInstanceUnavailableError,
} from "../../errors/fdc3-errors"
import { isFdc3VersionAtLeast } from "../../agent/fdc3-version"
import { getInstance, getListenersForInstance } from "../../state/selectors"
import { registerIntentListener, unregisterIntentListener } from "../../state/mutators"
import { deliverPendingIntentsForListener } from "./intent-delivery-helpers"
import { findConflictingIntentListener } from "./intent-listener-conflict"

type AddIntentListenerPayload = BrowserTypes.AddIntentListenerRequest["payload"] & {
  /** FDC3 3.0 addIntentListenerWithContext — optional until @finos/fdc3 BrowserTypes include it. */
  contextType?: string | string[] | null
}

function normalizeIntentListenerContextTypes(
  contextType: AddIntentListenerPayload["contextType"],
): string[] {
  if (contextType == null) {
    return []
  }

  if (Array.isArray(contextType)) {
    return contextType.filter((type): type is string => typeof type === "string" && type.length > 0)
  }

  return contextType.length > 0 ? [contextType] : []
}

export function handleAddIntentListener(
  message: BrowserTypes.AddIntentListenerRequest,
  params: DACPHandlerParams,
): void {
  const { responses, instanceId, getState, setState, logger, implementationMetadata } = params

  try {
    const payload = message.payload as AddIntentListenerPayload
    const instance = getInstance(getState(), instanceId)

    if (!instance) {
      throw new TargetInstanceUnavailableError(
        `Instance ${instanceId} not found for adding intent listener`,
      )
    }

    // FDC3 3.0 addIntentListenerWithContext: `payload.contextType` must not be read at all at
    // 2.2 — the 2.2 JSON Schema has `additionalProperties: false`, so a 3.0 field on the wire
    // would otherwise be silently honoured even though the message fails schema validation.
    const supportsIntentListenerContext = isFdc3VersionAtLeast(
      implementationMetadata.fdc3Version,
      "3.0",
    )
    const contextTypes = supportsIntentListenerContext
      ? normalizeIntentListenerContextTypes(payload.contextType)
      : []

    if (supportsIntentListenerContext) {
      const conflict = findConflictingIntentListener(
        getListenersForInstance(getState(), instanceId),
        payload.intent,
        instanceId,
        contextTypes,
      )
      if (conflict) {
        throw new IntentListenerConflictError(
          `Intent listener conflict for intent "${payload.intent}" on instance ${instanceId}`,
        )
      }
    }

    const listenerId = crypto.randomUUID()

    setState(state =>
      registerIntentListener(state, {
        listenerId,
        intentName: payload.intent,
        instanceId,
        appId: instance.appId,
        contextTypes,
      }),
    )

    const response = createDACPSuccessResponse(message, "addIntentListenerResponse", {
      listenerUUID: listenerId,
    })

    sendDACPResponse({ response, instanceId, responses })

    deliverPendingIntentsForListener(params, payload.intent)
  } catch (error) {
    logger.error("DACP: Add intent listener failed", error)

    // Use ResolveError for intent listener errors (AddIntentListenerResponse validates ResolveError enum values)
    const errorType = error instanceof FDC3ResolveError ? error.errorType : ResolveError.ApiTimeout
    const errorMessage = error instanceof Error ? error.message : "Failed to add intent listener"

    sendDACPErrorResponse({
      message,
      errorType,
      errorMessage,
      instanceId,
      responses,
    })
  }
}

export function handleIntentListenerUnsubscribe(
  message: BrowserTypes.IntentListenerUnsubscribeRequest,
  params: DACPHandlerParams,
): void {
  const { responses, instanceId, getState, setState, logger } = params

  try {
    const { listenerUUID } = message.payload

    // Check if listener exists before removing
    const state = getState()
    const listener = state.intents.listeners[listenerUUID]
    if (!listener || listener.instanceId !== instanceId) {
      throw new TargetInstanceUnavailableError(`Intent listener ${listenerUUID} not found`)
    }

    setState(state => unregisterIntentListener(state, listenerUUID))

    const response = createDACPSuccessResponse(message, "intentListenerUnsubscribeResponse")
    sendDACPResponse({ response, instanceId, responses })
  } catch (error) {
    logger.error("DACP: Intent listener unsubscribe failed", error)

    // Use ResolveError for intent listener errors
    const errorType = error instanceof FDC3ResolveError ? error.errorType : ResolveError.ApiTimeout
    const errorMessage =
      error instanceof Error ? error.message : "Failed to unsubscribe intent listener"

    sendDACPErrorResponse({
      message,
      errorType,
      errorMessage,
      instanceId,
      responses,
    })
  }
}

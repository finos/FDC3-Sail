import { createDACPSuccessResponse } from "../../dacp/dacp-message-creators"
import { type DACPHandlerParams } from "../types"
import { sendDACPResponse, sendDACPErrorResponse } from "../utils/dacp-response-utils"
import type { AppIdentifier, BrowserTypes, Context } from "@finos/fdc3"
import { ResolveError } from "@finos/fdc3"
import {
  NoAppsFoundError,
  IntentDeliveryFailedError,
  UserCancelledError,
} from "../../errors/fdc3-errors"
import { getInstance, getInstancesByAppId } from "../../state/selectors"
import { findIntentHandlers, appIntentForWireResponse } from "./intent-helpers"
import { launchAppAndWaitForInstance } from "./intent-launch-helpers"
import {
  appsToIntentHandlerOptions,
  createResolverAppIntent,
  findMatchingIntentResolutionChoice,
} from "./intent-resolver-helpers"
import { isDirectoryIntentCompatible } from "./intent-directory-helpers"
import { isValidContext } from "../utils/context-validation"
import {
  attachPendingIntentTimeout,
  cleanupPendingIntentRequest,
  mapIntentRaiseErrorToResolveError,
  normalizeTargetApp,
  registerPendingIntentState,
  resolveAppTargetInstance,
  schedulePendingIntentDelivery,
  validateRequestedTargetAvailability,
} from "./intent-raise-shared"

export async function handleRaiseIntentRequest(
  message: BrowserTypes.RaiseIntentRequest,
  params: DACPHandlerParams,
): Promise<void> {
  const { responses, instanceId, getState, logger, logPayloadDetail } = params

  try {
    const payload = message.payload

    // `RaiseIntentRequestPayload.context` is required, so a missing context is malformed —
    // do not short-circuit on `undefined`. Matches `handleRaiseIntentForContextRequest`.
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

    const validatedContext: Context = payload.context
    const contextPayload = validatedContext as Record<string, unknown>
    logger.info("DACP: Processing raise intent request", {
      type: message.type,
      intent: payload.intent,
      requestUuid: message.meta.requestUuid,
      contextType: validatedContext.type,
      contextKeys: Object.keys(contextPayload),
      hasId: !!validatedContext.id,
      hasName: typeof contextPayload.name === "string",
    })

    if (logPayloadDetail === "full") {
      logger.debug("DACP: Processing raise intent request (full payload)", {
        contextPayload: JSON.stringify(contextPayload),
      })
    }

    const targetApp: AppIdentifier | undefined = normalizeTargetApp(payload.app)
    validateRequestedTargetAvailability(params, targetApp)

    const source = getInstance(getState(), instanceId)
    if (!source) {
      throw new IntentDeliveryFailedError(`Source instance ${instanceId} not found`)
    }

    const state = getState()
    const handlers = findIntentHandlers(state, state.appDirectory, {
      intent: payload.intent,
      context: validatedContext,
      source: { appId: source.appId, instanceId: source.instanceId },
      target: targetApp,
    })

    const targetAppId = targetApp?.appId
    const runningInstances = targetAppId ? getInstancesByAppId(state, targetAppId) : []
    const isTargetRunning =
      !!targetApp?.instanceId || (targetAppId ? runningInstances.length > 0 : false)

    if (
      targetAppId &&
      isTargetRunning &&
      !isDirectoryIntentCompatible(
        state.appDirectory,
        targetAppId,
        payload.intent,
        validatedContext.type,
      ) &&
      handlers.runningListeners.length === 0
    ) {
      throw new NoAppsFoundError(`No apps found to handle intent: ${payload.intent}`)
    }

    if (!targetApp && handlers.compatibleApps.length === 0) {
      throw new NoAppsFoundError(`No apps found to handle intent: ${payload.intent}`)
    }

    let targetInstanceId: string
    let targetInstanceIsLaunched = false
    let resolverSelectedAppId: string | undefined

    // Resolve target instance in priority order: explicit instance -> targeted app -> resolver selection -> running listener -> launch.
    if (targetApp?.instanceId) {
      targetInstanceId = targetApp.instanceId
    } else if (targetAppId) {
      const runningListener = handlers.runningListeners.find(
        listener => listener.appId === targetAppId,
      )
      const resolvedTarget = await resolveAppTargetInstance(params, {
        appId: targetAppId,
        validatedContext,
        runningListenerInstanceId: runningListener?.instanceId,
      })
      targetInstanceId = resolvedTarget.targetInstanceId
      targetInstanceIsLaunched = resolvedTarget.targetInstanceIsLaunched
    } else if (handlers.compatibleApps.length > 1) {
      const appIntent = createResolverAppIntent(
        getState(),
        getState().appDirectory,
        payload.intent,
        validatedContext.type,
      )
      if (params.requestIntentResolution) {
        const handlerOptions = appsToIntentHandlerOptions(getState(), appIntent.apps)
        const choices = handlerOptions.map(handler => ({
          intent: appIntent.intent,
          handler,
        }))
        const resolution = await params.requestIntentResolution({
          requestId: message.meta.requestUuid,
          intent: payload.intent,
          context: validatedContext,
          handlers: handlerOptions,
          choices,
        })
        if (resolution.selectedHandler == null) {
          throw new UserCancelledError("User cancelled intent resolution")
        }
        const selectedChoice = findMatchingIntentResolutionChoice(
          choices,
          resolution.selectedHandler,
          payload.intent,
        )
        if (!selectedChoice) {
          throw new IntentDeliveryFailedError("Intent resolver selected an unavailable handler")
        }
        const selectedTarget = selectedChoice.handler
        resolverSelectedAppId = selectedTarget.appId
        const resolvedTarget = await resolveAppTargetInstance(params, {
          appId: selectedTarget.appId,
          validatedContext,
          preferredInstanceId: selectedTarget.instanceId,
          forceLaunch: !selectedTarget.instanceId,
        })
        targetInstanceId = resolvedTarget.targetInstanceId
        targetInstanceIsLaunched = resolvedTarget.targetInstanceIsLaunched
      } else {
        const response = createDACPSuccessResponse(message, "raiseIntentResponse", {
          appIntent: appIntentForWireResponse(appIntent),
        })
        sendDACPResponse({ response, instanceId, responses })
        return
      }
    } else if (handlers.runningListeners.length > 0) {
      targetInstanceId = handlers.runningListeners[0]!.instanceId
    } else if (handlers.availableApps.length > 0) {
      targetInstanceIsLaunched = true
      targetInstanceId = await launchAppAndWaitForInstance(
        handlers.availableApps[0]!.appId,
        params,
        validatedContext,
      )
    } else {
      throw new NoAppsFoundError(`No handler found for intent: ${payload.intent}`)
    }

    const requestId = message.meta.requestUuid

    const targetInstance = getInstance(getState(), targetInstanceId)
    const resolvedTargetAppId =
      targetInstance?.appId ?? targetAppId ?? resolverSelectedAppId ?? source.appId

    registerPendingIntentState(params, {
      requestId,
      intentName: payload.intent,
      context: validatedContext,
      sourceInstanceId: instanceId,
      targetInstanceId,
      targetAppId: resolvedTargetAppId,
      requestType: "raiseIntentRequest",
    })

    // Newly launched apps may not have registered listeners yet, so queue delivery until ready.
    schedulePendingIntentDelivery(
      params,
      requestId,
      targetInstanceId,
      payload.intent,
      targetInstanceIsLaunched,
    )

    attachPendingIntentTimeout(params, requestId)
  } catch (error) {
    const requestId = message.meta.requestUuid
    cleanupPendingIntentRequest(requestId)

    const payload = message.payload
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- `payload` is parsed from an inbound DACP raiseIntentRequest message; the schema type is an assumption about a well-behaved peer, not a guarantee, especially here in the error-handling path.
    const contextPayload = payload?.context as Record<string, unknown> | undefined

    logger.error("DACP: Raise intent request failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      contextType: contextPayload?.type,
      contextHasName: typeof contextPayload?.name === "string",
    })

    const errorType = mapIntentRaiseErrorToResolveError(error)
    const errorMessage = error instanceof Error ? error.message : String(error)

    sendDACPErrorResponse({
      message,
      errorType,
      errorMessage,
      instanceId,
      responses,
    })
  }
}

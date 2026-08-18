import { createDACPSuccessResponse } from "../../dacp/dacp-message-creators"
import { type DACPHandlerParams } from "../types"
import { sendDACPResponse, sendDACPErrorResponse } from "../utils/dacp-response-utils"
import type { BrowserTypes } from "@finos/fdc3"
import { ResolveError } from "@finos/fdc3"
import {
  NoAppsFoundError,
  IntentDeliveryFailedError,
  UserCancelledError,
} from "../../errors/fdc3-errors"
import { getAllIntentListeners, getInstance } from "../../state/selectors"
import {
  findIntentHandlers,
  findIntentsByContext,
  appIntentForWireResponse,
} from "./intent-helpers"
import { launchAppAndWaitForInstance } from "./intent-launch-helpers"
import {
  createResolverAppIntent,
  appsToIntentHandlerOptions,
  findMatchingIntentResolutionChoice,
} from "./intent-resolver-helpers"
import { getDirectoryIntentsForContext } from "./intent-directory-helpers"
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

function selectIntentCandidatesForContext(
  targetAppId: string | undefined,
  directoryIntents: string[],
  dynamicIntents: string[],
  discoveredIntentNames: string[],
  contextType: string,
): string[] {
  if (targetAppId) {
    // Respect explicit targeting: do not fall back to other apps.
    if (directoryIntents.length > 0) {
      return directoryIntents
    }
    if (dynamicIntents.length > 0) {
      return dynamicIntents
    }
    throw new NoAppsFoundError(
      `Target app ${targetAppId} has no intents that handle context type: ${contextType}`,
    )
  }

  if (discoveredIntentNames.length === 0) {
    throw new NoAppsFoundError(`No intents found to handle context type: ${contextType}`)
  }

  return discoveredIntentNames
}

function buildResolverAppIntents(
  params: DACPHandlerParams,
  intentCandidates: string[],
  contextType: string,
) {
  const { getState } = params
  const catalog = getState().appDirectory
  return intentCandidates
    .map(intentName => createResolverAppIntent(getState(), catalog, intentName, contextType))
    .filter(appIntent => appIntent.apps.length > 0)
}

function finalizeRaiseIntentForContextDelivery(
  params: DACPHandlerParams,
  message: BrowserTypes.RaiseIntentForContextRequest,
  sourceInstanceId: string,
  intentName: string,
  validatedContext: BrowserTypes.Context,
  targetInstanceId: string,
  targetAppId: string,
  targetInstanceIsLaunched: boolean,
  explicitTargetInstanceId: boolean,
): void {
  const requestId = message.meta.requestUuid
  registerPendingIntentState(params, {
    requestId,
    intentName,
    context: validatedContext,
    sourceInstanceId,
    targetInstanceId,
    targetAppId,
    requestType: "raiseIntentForContextRequest",
  })
  schedulePendingIntentDelivery(
    params,
    requestId,
    targetInstanceId,
    intentName,
    targetInstanceIsLaunched,
    explicitTargetInstanceId,
  )
  attachPendingIntentTimeout(params, requestId)
}

export async function handleRaiseIntentForContextRequest(
  message: BrowserTypes.RaiseIntentForContextRequest,
  params: DACPHandlerParams,
): Promise<void> {
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
    const validatedContext = payload.context

    const targetApp = normalizeTargetApp(payload.app)
    validateRequestedTargetAvailability(params, targetApp)

    const source = getInstance(getState(), instanceId)
    if (!source) {
      throw new IntentDeliveryFailedError(`Source instance ${instanceId} not found`)
    }

    const intentMetadata = findIntentsByContext(
      getState(),
      getState().appDirectory,
      validatedContext.type,
    )
    if (intentMetadata.length === 0) {
      throw new NoAppsFoundError(
        `No intents found to handle context type: ${validatedContext.type}`,
      )
    }

    const targetAppId = targetApp?.appId
    const directoryIntents = targetAppId
      ? getDirectoryIntentsForContext(getState().appDirectory, targetAppId, validatedContext.type)
      : []

    const dynamicIntents = targetAppId
      ? getAllIntentListeners(getState())
          .filter(listener => listener.appId === targetAppId && listener.active)
          .map(listener => listener.intentName)
      : []

    const intentCandidates = selectIntentCandidatesForContext(
      targetAppId,
      directoryIntents,
      dynamicIntents,
      intentMetadata.map(intent => intent.name),
      validatedContext.type,
    )

    // selectIntentCandidatesForContext's three return paths are all non-empty (two are
    // guarded by `.length > 0`, the third throws on empty), so `[0]` is always defined.
    let selectedIntent = intentCandidates[0]!
    let targetInstanceId: string | undefined
    let targetInstanceIsLaunched = false
    let resolverSelectedAppId: string | undefined

    if (!targetApp && intentCandidates.length > 1) {
      const appIntents = buildResolverAppIntents(params, intentCandidates, validatedContext.type)

      if (appIntents.length === 0) {
        throw new NoAppsFoundError(`No apps found to handle context type: ${validatedContext.type}`)
      }

      if (params.requestIntentResolution) {
        const choices = appIntents.flatMap(appIntent =>
          appsToIntentHandlerOptions(getState(), appIntent.apps).map(handler => ({
            intent: appIntent.intent,
            handler,
          })),
        )

        if (choices.length === 0) {
          throw new NoAppsFoundError(
            `No apps found to handle context type: ${validatedContext.type}`,
          )
        }

        const requestId = message.meta.requestUuid
        const resolution = await params.requestIntentResolution({
          requestId,
          intent: choices[0]!.intent.name,
          context: validatedContext,
          handlers: choices.map(choice => choice.handler),
          choices,
        })
        if (resolution.selectedHandler == null) {
          throw new UserCancelledError("User cancelled intent resolution")
        }
        if (!resolution.intent) {
          throw new IntentDeliveryFailedError("Intent resolver did not select an intent")
        }
        const selectedChoice = findMatchingIntentResolutionChoice(
          choices,
          resolution.selectedHandler,
          resolution.intent,
        )
        if (!selectedChoice) {
          throw new IntentDeliveryFailedError("Intent resolver selected an unavailable handler")
        }
        selectedIntent = selectedChoice.intent.name
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
        const response = createDACPSuccessResponse(message, "raiseIntentForContextResponse", {
          appIntents: appIntents.map(appIntentForWireResponse),
        })
        sendDACPResponse({ response, instanceId, responses })
        return
      }
    } else {
      const state = getState()
      const handlers = findIntentHandlers(state, state.appDirectory, {
        intent: selectedIntent,
        context: validatedContext,
        source: { appId: source.appId, instanceId: source.instanceId },
        target: targetApp,
      })

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
        throw new NoAppsFoundError(`No handler found for intent: ${selectedIntent}`)
      }
    }

    if (!targetInstanceId) {
      throw new IntentDeliveryFailedError("No target instance resolved for raiseIntentForContext")
    }

    const targetInstance = getInstance(getState(), targetInstanceId)
    const resolvedTargetAppId =
      targetInstance?.appId ?? targetAppId ?? resolverSelectedAppId ?? source.appId

    finalizeRaiseIntentForContextDelivery(
      params,
      message,
      instanceId,
      selectedIntent,
      validatedContext,
      targetInstanceId,
      resolvedTargetAppId,
      targetInstanceIsLaunched,
      Boolean(targetApp?.instanceId),
    )
  } catch (error) {
    const requestId = message.meta.requestUuid
    cleanupPendingIntentRequest(requestId)

    logger.error("DACP: Raise intent for context request failed", error)

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

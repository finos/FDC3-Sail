import type { AppIdentifier, Context } from "@finos/fdc3"
import { ResolveError } from "@finos/fdc3"
import { addPendingIntent, resolvePendingIntent } from "../../state/mutators"
import {
  getInstance,
  getInstancesByAppId,
  getPendingIntent,
  isInstanceConnected,
  isInstanceReceivable,
} from "../../state/selectors"
import type { PendingIntent } from "../../state/types"
import {
  FDC3ResolveError,
  NoAppsFoundError,
  TargetAppUnavailableError,
  TargetInstanceUnavailableError,
} from "../../errors/fdc3-errors"
import {
  attemptIntentDelivery,
  queueIntentDelivery,
  sendTerminalPendingIntentResponse,
} from "./intent-delivery-helpers"
import { resolveKnownAppId, retrieveAppsById } from "../../app-directory/app-directory-queries"
import type { DACPHandlerParams } from "../types"
import {
  clearPendingIntentTimeouts,
  registerPendingIntentTimeout,
  releasePendingIntentTimeout,
} from "./intent-pending-timeout-registry"
import { findIntentHandlers, shouldWaitForIntentListenerBeforeDelivery } from "./intent-helpers"
import { launchAppAndWaitForInstance } from "./intent-launch-helpers"
import { isFdc3VersionAtLeast } from "../../agent/fdc3-version"

type ResolveAppTargetInstanceOptions = {
  appId: string
  validatedContext: Context
  preferredInstanceId?: string
  runningListenerInstanceId?: string
  forceLaunch?: boolean
  /**
   * FDC3 3.0 `newInstance`: `true` always launches; `false` never launches and fails with
   * `TargetInstanceUnavailable` when no instance is running. Unset keeps the default choice.
   */
  newInstance?: boolean
}

/**
 * The raise payload's `app` as an AppIdentifier, with its appId mapped to the directory's own
 * (fully-qualified or not) so the resolution reports the appId that was matched.
 */
export function normalizeTargetApp(
  params: DACPHandlerParams,
  target: unknown,
): AppIdentifier | undefined {
  if (!target) {
    return undefined
  }

  const catalog = params.getState().appDirectory
  if (typeof target === "string") {
    return { appId: resolveKnownAppId(catalog, target) }
  }

  if (typeof target !== "object") {
    return undefined
  }

  const record = target as Record<string, unknown>
  if (typeof record.appId !== "string") {
    return undefined
  }

  return {
    appId: resolveKnownAppId(catalog, record.appId),
    instanceId: typeof record.instanceId === "string" ? record.instanceId : undefined,
  }
}

export function validateRequestedTargetAvailability(
  params: DACPHandlerParams,
  targetApp: AppIdentifier | undefined,
): void {
  if (!targetApp) {
    return
  }

  const apps = retrieveAppsById(params.getState().appDirectory, targetApp.appId)
  if (apps.length === 0) {
    throw new TargetAppUnavailableError(`App not found in directory: ${targetApp.appId}`)
  }

  if (!targetApp.instanceId) {
    return
  }

  const instance = getInstance(params.getState(), targetApp.instanceId)
  if (!instance) {
    throw new TargetInstanceUnavailableError(
      `Instance not found or terminated: ${targetApp.instanceId}`,
    )
  }
}

export async function resolveAppTargetInstance(
  params: DACPHandlerParams,
  options: ResolveAppTargetInstanceOptions,
): Promise<{ targetInstanceId: string; targetInstanceIsLaunched: boolean }> {
  const { appId, validatedContext, preferredInstanceId, runningListenerInstanceId, newInstance } =
    options

  if (newInstance === true) {
    const targetInstanceId = await launchAppAndWaitForInstance(appId, params, validatedContext)
    return { targetInstanceId, targetInstanceIsLaunched: true }
  }

  if (preferredInstanceId) {
    const instance = getInstance(params.getState(), preferredInstanceId)
    if (instance) {
      return { targetInstanceId: instance.instanceId, targetInstanceIsLaunched: false }
    }
  }

  if (runningListenerInstanceId) {
    return { targetInstanceId: runningListenerInstanceId, targetInstanceIsLaunched: false }
  }

  if (options.forceLaunch && newInstance !== false) {
    const targetInstanceId = await launchAppAndWaitForInstance(appId, params, validatedContext)
    return { targetInstanceId, targetInstanceIsLaunched: true }
  }

  const runningInstances = getInstancesByAppId(params.getState(), appId).filter(
    isInstanceReceivable,
  )
  if (runningInstances.length > 0) {
    const connectedInstances = runningInstances.filter(isInstanceConnected)
    const candidates = connectedInstances.length > 0 ? connectedInstances : runningInstances
    const targetInstance = candidates.reduce((latest, instance) =>
      instance.lastActivity.getTime() > latest.lastActivity.getTime() ? instance : latest,
    )
    return { targetInstanceId: targetInstance.instanceId, targetInstanceIsLaunched: false }
  }

  if (newInstance === false) {
    throw new TargetInstanceUnavailableError(`No running instance of ${appId} to use`)
  }

  const targetInstanceId = await launchAppAndWaitForInstance(appId, params, validatedContext)
  return { targetInstanceId, targetInstanceIsLaunched: true }
}

/**
 * Picks the handler for a raise that names no target app and needs no resolver: a running
 * listener, else a launch of the first app that can handle it. `newInstance` overrides that
 * default as in {@link resolveAppTargetInstance}.
 */
export async function resolveUntargetedInstance(
  params: DACPHandlerParams,
  handlers: ReturnType<typeof findIntentHandlers>,
  intent: string,
  validatedContext: Context,
  newInstance: boolean | undefined,
): Promise<{ targetInstanceId: string; targetInstanceIsLaunched: boolean }> {
  const runningListener = handlers.runningListeners[0]
  if (runningListener && newInstance !== true) {
    return { targetInstanceId: runningListener.instanceId, targetInstanceIsLaunched: false }
  }
  if (newInstance === false) {
    throw new TargetInstanceUnavailableError(`No running instance handles intent: ${intent}`)
  }
  const app = handlers.availableApps[0]
  if (!app) {
    throw new NoAppsFoundError(`No handler found for intent: ${intent}`)
  }
  const targetInstanceId = await launchAppAndWaitForInstance(app.appId, params, validatedContext)
  return { targetInstanceId, targetInstanceIsLaunched: true }
}

/** FDC3 3.0 `newInstance` on a raise payload; ignored below 3.0 like the other 3.0 fields. */
export function readRaiseNewInstance(
  params: DACPHandlerParams,
  payload: { newInstance?: boolean | null },
): boolean | undefined {
  if (!isFdc3VersionAtLeast(params.implementationMetadata.fdc3Version, "3.0")) {
    return undefined
  }
  return typeof payload.newInstance === "boolean" ? payload.newInstance : undefined
}

export function registerPendingIntentState(
  params: DACPHandlerParams,
  options: Omit<PendingIntent, "raisedAt">,
): void {
  params.setState(state => addPendingIntent(state, options))
}

export function schedulePendingIntentDelivery(
  params: DACPHandlerParams,
  requestId: string,
  targetInstanceId: string,
  intentName: string,
  targetInstanceIsLaunched: boolean,
  explicitTargetInstanceId = false,
): void {
  const shouldWaitForListener = shouldWaitForIntentListenerBeforeDelivery(
    params,
    targetInstanceId,
    intentName,
    targetInstanceIsLaunched,
    explicitTargetInstanceId,
  )

  if (shouldWaitForListener) {
    queueIntentDelivery(params, requestId, true)
  } else {
    attemptIntentDelivery(params, requestId, false)
  }
}

export function attachPendingIntentTimeout(params: DACPHandlerParams, requestId: string): void {
  const timeoutHandle = setTimeout(() => {
    releasePendingIntentTimeout(requestId, "raise")
    const pendingIntent = getPendingIntent(params.getState(), requestId)
    if (!pendingIntent) {
      return
    }
    params.setState(state => resolvePendingIntent(state, requestId))
    // Terminal response so the raiser settles. Which stage that is depends on whether the
    // intent was ever delivered — `pendingIntentTimeoutMs` can be configured below
    // `openContextListenerTimeoutMs`, in which case this fires on an undelivered intent whose
    // raiser is still awaiting `raiseIntentResponse`.
    sendTerminalPendingIntentResponse(
      params,
      pendingIntent,
      "Intent abandoned before a result was returned",
    )
  }, params.pendingIntentTimeoutMs)
  registerPendingIntentTimeout(requestId, "raise", timeoutHandle)
}

export function cleanupPendingIntentRequest(requestId: string): void {
  clearPendingIntentTimeouts(requestId)
}

export function mapIntentRaiseErrorToResolveError(error: unknown): ResolveError {
  if (error instanceof NoAppsFoundError) {
    return ResolveError.NoAppsFound
  }
  if (error instanceof TargetAppUnavailableError) {
    return ResolveError.TargetAppUnavailable
  }
  if (error instanceof TargetInstanceUnavailableError) {
    return ResolveError.TargetInstanceUnavailable
  }
  if (error instanceof FDC3ResolveError) {
    return error.errorType
  }

  return ResolveError.IntentDeliveryFailed
}

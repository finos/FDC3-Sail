/**
 * Intent Handler Helper Functions
 *
 * Pure helper functions used by intent handlers.
 * Extracted to reduce file size of intent-handlers.ts.
 */

import type { AppIdentifier, AppMetadata, Context, IntentMetadata } from "@finos/fdc3"
import type { AgentState, IntentListener, AppDirectoryState } from "../../state/types"
import type { DACPHandlerParams } from "../types"
import {
  getInstance,
  getActiveListenersForIntent,
  isInstanceConnected,
} from "../../state/selectors"
import {
  retrieveAllApps,
  retrieveAppsById,
  retrieveIntents,
} from "../../app-directory/app-directory-queries"
import { isIntentListenerReady } from "./intent-delivery-helpers"

/**
 * FDC3 `AppIntent` with the `apps` element type left open, so each call site can narrow to the
 * app metadata subset it actually produces (wire response, resolver payload, discovery result).
 */
export type AppIntentLike<TApp> = {
  intent: Pick<IntentMetadata, "name" | "displayName">
  apps: TApp[]
}

/** The `AppMetadata` subset findIntent* discovery responses carry per app. */
type DiscoveredAppMetadata = Pick<AppMetadata, "appId" | "name" | "version" | "instanceId">

/**
 * FDC3 raiseIntent* wire responses surface `intent.name` as `intent.displayName`
 * on the wire, even when App Directory metadata carries a human-readable label.
 */
export function appIntentForWireResponse<T extends AppIntentLike<unknown>>(appIntent: T): T {
  return {
    ...appIntent,
    intent: { name: appIntent.intent.name, displayName: appIntent.intent.name },
  }
}

/**
 * Whether raiseIntent* should queue delivery until the target registers a listener.
 * Explicit instance targeting to a connected app delivers immediately.
 */
export function shouldWaitForIntentListenerBeforeDelivery(
  params: DACPHandlerParams,
  targetInstanceId: string,
  intentName: string,
  targetInstanceIsLaunched: boolean,
  explicitTargetInstanceId: boolean,
): boolean {
  if (targetInstanceIsLaunched) {
    return true
  }
  if (explicitTargetInstanceId) {
    const instance = getInstance(params.getState(), targetInstanceId)
    if (instance && isInstanceConnected(instance)) {
      return false
    }
  }
  return !isIntentListenerReady(params, targetInstanceId, intentName)
}

/**
 * Resolves human-readable intent labels from App Directory `displayName` entries.
 * FDC3 findIntent / findIntentsByContext responses must surface directory metadata,
 * not the internal intent name.
 */
function getIntentDisplayNameFromDirectory(
  catalog: AppDirectoryState,
  intentName: string,
  contextType?: string,
): string {
  const directoryIntents = retrieveIntents(catalog, contextType, intentName, undefined)
  const withDisplayName = directoryIntents.find(
    entry => typeof entry.displayName === "string" && entry.displayName.length > 0,
  )
  return withDisplayName?.displayName ?? intentName
}

/**
 * Helper to check if context type is compatible with supported types
 */
export function isContextTypeCompatible(supportedTypes: string[], contextType: string): boolean {
  if (supportedTypes.length === 0) {
    return true // Accepts all context types
  }
  return supportedTypes.includes(contextType) || supportedTypes.includes("*")
}

/**
 * Helper to check if result types match, including channel types.
 */
export function isResultTypeCompatible(
  actualResultType: string | undefined,
  requiredResultType: string | undefined,
): boolean {
  if (requiredResultType === undefined) {
    return true
  }
  if (actualResultType === undefined) {
    return false
  }

  const normalizedActualResultType = actualResultType.trim().toLowerCase()
  const normalizedRequiredResultType = requiredResultType.trim().toLowerCase()

  if (normalizedRequiredResultType === "channel") {
    return (
      normalizedActualResultType === "channel" || normalizedActualResultType.startsWith("channel<")
    )
  }

  if (normalizedRequiredResultType.startsWith("channel<")) {
    return normalizedActualResultType === normalizedRequiredResultType
  }

  return normalizedActualResultType === normalizedRequiredResultType
}

/**
 * Helper to find intent handlers using state and app directory
 * Replaces intentRegistry.findIntentHandlers()
 */
export function findIntentHandlers(
  state: AgentState,
  catalog: AppDirectoryState,
  request: {
    intent: string
    context: Context
    target?: AppIdentifier
    source?: AppIdentifier
  },
): {
  runningListeners: IntentListener[]
  availableApps: Array<{
    intentName: string
    appId: string
    contextTypes: string[]
    resultType?: string
    displayName?: string
  }>
  compatibleApps: (
    | IntentListener
    | {
        intentName: string
        appId: string
        contextTypes: string[]
        resultType?: string
        displayName?: string
      }
  )[]
} {
  const { intent, context, target, source } = request

  // Get running listeners for this intent
  let runningListeners = getActiveListenersForIntent(state, intent)

  // Filter by context type compatibility
  runningListeners = runningListeners.filter(l =>
    isContextTypeCompatible(l.contextTypes, context.type),
  )

  // Filter out the source instance from running listeners
  if (source?.instanceId) {
    runningListeners = runningListeners.filter(
      listener => listener.instanceId !== source.instanceId,
    )
  }

  // Filter by target if specified
  if (target?.appId) {
    runningListeners = runningListeners.filter(listener => listener.appId === target.appId)
  }

  // Get app capabilities from app directory
  const allApps = retrieveAllApps(catalog)
  let availableApps = allApps
    .filter(app => {
      const intents = app.interop?.intents?.listensFor
      if (!intents || typeof intents !== "object") return false
      const intentDef = intents[intent]
      if (!intentDef || typeof intentDef !== "object" || !("contexts" in intentDef)) return false
      const contextTypes = Array.isArray(intentDef.contexts) ? intentDef.contexts : []
      return isContextTypeCompatible(contextTypes, context.type)
    })
    .map(app => {
      const intents = app.interop?.intents?.listensFor
      const intentDef = intents?.[intent]
      const contextTypes = intentDef && Array.isArray(intentDef.contexts) ? intentDef.contexts : []
      return {
        intentName: intent,
        appId: app.appId,
        contextTypes,
        resultType: typeof intentDef?.resultType === "string" ? intentDef.resultType : undefined,
        displayName: typeof intentDef?.displayName === "string" ? intentDef.displayName : undefined,
      }
    })

  // Filter by target if specified
  if (target?.appId) {
    availableApps = availableApps.filter(capability => capability.appId === target.appId)
  }

  // Combine and deduplicate (prefer running listeners)
  const runningAppIds = new Set(runningListeners.map(l => l.appId))
  const compatibleApps: (IntentListener | (typeof availableApps)[0])[] = [
    ...runningListeners,
    ...availableApps.filter(app => !runningAppIds.has(app.appId)),
  ]

  return {
    runningListeners,
    availableApps,
    compatibleApps,
  }
}

/**
 * Helper to create AppIntent objects for FDC3 API responses
 * Replaces intentRegistry.createAppIntents()
 * Includes both apps from directory and running instances with intent listeners
 */
export function createAppIntents(
  state: AgentState,
  catalog: AppDirectoryState,
  intentName: string,
  contextType?: string,
  resultType?: string,
): Array<AppIntentLike<DiscoveredAppMetadata>> {
  const allApps = retrieveAllApps(catalog)
  const appIntentsMap = new Map<string, AppIntentLike<DiscoveredAppMetadata>>()

  // Get running listeners for this intent
  let runningListeners = getActiveListenersForIntent(state, intentName)

  // Filter by context type if provided
  if (contextType) {
    runningListeners = runningListeners.filter(listener =>
      isContextTypeCompatible(listener.contextTypes, contextType),
    )
  }

  // Filter out listeners whose instance was removed (Option A lifecycle)
  const validRunningListeners = runningListeners.filter(listener => {
    return getInstance(state, listener.instanceId) !== undefined
  })

  // Filter running listeners by resultType if provided
  // Check resultType from app directory for each listener's app
  // Note: resultType can be undefined (from "{empty}"), which means "no result type"
  // When resultType is undefined, include all running instances
  // When resultType is defined, only include running instances that match (must be in directory)
  const filteredRunningListeners =
    resultType !== undefined
      ? validRunningListeners.filter(listener => {
          const apps = retrieveAppsById(catalog, listener.appId)
          const appInfo = apps[0]
          if (!appInfo) {
            // If app is not in directory, we can't check resultType, so exclude it
            // (only apps in directory can be filtered by resultType)
            return false
          }
          const intents = appInfo.interop?.intents?.listensFor
          if (!intents || typeof intents !== "object") return false
          const intentDef = intents[intentName]
          if (!intentDef || typeof intentDef !== "object") return false
          const actualResultType =
            typeof intentDef.resultType === "string" ? intentDef.resultType : undefined
          return isResultTypeCompatible(actualResultType, resultType)
        })
      : validRunningListeners

  // First, add apps from directory in directory order
  allApps.forEach(app => {
    const intents = app.interop?.intents?.listensFor
    if (!intents || typeof intents !== "object") return
    const intentDef = intents[intentName]
    if (!intentDef || typeof intentDef !== "object" || !("contexts" in intentDef)) return

    const contextTypes = Array.isArray(intentDef.contexts) ? intentDef.contexts : []
    if (contextType && !isContextTypeCompatible(contextTypes, contextType)) return

    // Filter by resultType if provided
    // Note: resultType can be undefined (from "{empty}"), which means "no result type"
    const actualResultType =
      typeof intentDef.resultType === "string" ? intentDef.resultType : undefined
    if (resultType !== undefined && !isResultTypeCompatible(actualResultType, resultType)) return

    if (!appIntentsMap.has(intentName)) {
      appIntentsMap.set(intentName, {
        intent: {
          name: intentName,
          displayName:
            typeof intentDef.displayName === "string"
              ? intentDef.displayName
              : getIntentDisplayNameFromDirectory(catalog, intentName, contextType),
        },
        apps: [],
      })
    }

    const appIntent = appIntentsMap.get(intentName)!
    appIntent.apps.push({
      appId: app.appId,
      name: app.name,
      version: app.version,
      // No instanceId for directory apps
    })
  })

  // Then, add running instances with their instanceId
  if (filteredRunningListeners.length > 0) {
    if (!appIntentsMap.has(intentName)) {
      appIntentsMap.set(intentName, {
        intent: {
          name: intentName,
          displayName: getIntentDisplayNameFromDirectory(catalog, intentName, contextType),
        },
        apps: [],
      })
    }

    const appIntent = appIntentsMap.get(intentName)!
    filteredRunningListeners.forEach(listener => {
      const instance = getInstance(state, listener.instanceId)
      if (!instance) return

      const apps = retrieveAppsById(catalog, listener.appId)
      const appInfo = apps[0] // Take first matching app

      appIntent.apps.push({
        appId: listener.appId,
        name: appInfo?.name,
        version: appInfo?.version,
        instanceId: listener.instanceId,
      })
    })
  }

  return Array.from(appIntentsMap.values())
}

/**
 * Helper to find intents by context type
 * Replaces intentRegistry.findIntentsByContext()
 */
export function findIntentsByContext(
  _state: AgentState,
  catalog: AppDirectoryState,
  contextType: string,
): Array<Pick<IntentMetadata, "name" | "displayName">> {
  const orderedIntentNames: string[] = []
  const intentNameSet = new Set<string>()
  const displayNameByIntent = new Map<string, string>()

  const allApps = retrieveAllApps(catalog)
  allApps.forEach(app => {
    const intents = app.interop?.intents?.listensFor
    if (!intents || typeof intents !== "object") return
    Object.entries(intents).forEach(([intentName, intentDef]) => {
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- intentDef comes from app-directory JSON; the type is an assumption about what should arrive, not a fact about what does.
      if (intentDef && typeof intentDef === "object" && "contexts" in intentDef) {
        const contextTypes = Array.isArray(intentDef.contexts) ? intentDef.contexts : []
        if (isContextTypeCompatible(contextTypes, contextType)) {
          if (!intentNameSet.has(intentName)) {
            intentNameSet.add(intentName)
            orderedIntentNames.push(intentName)
          }
          if (typeof intentDef.displayName === "string" && !displayNameByIntent.has(intentName)) {
            displayNameByIntent.set(intentName, intentDef.displayName)
          }
        }
      }
    })
  })

  // Intent discovery lists come from the app directory for the requested context type.
  // Running listeners may add live instances via createAppIntents, but must not inflate
  // the intent list when directory metadata excludes that context.

  return orderedIntentNames.map(name => ({
    name,
    displayName:
      displayNameByIntent.get(name) ??
      getIntentDisplayNameFromDirectory(catalog, name, contextType),
  }))
}

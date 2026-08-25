/**
 * Intent Resolver Helper Functions
 *
 * Helpers for building appIntent payloads for resolver responses.
 */

import type { AppIdentifier, AppMetadata } from "@finos/fdc3"
import type { DirectoryApp } from "../../app-directory/types"
import type { AgentState, AppDirectoryState } from "../../state/types"
import { retrieveAllApps, retrieveAppsById } from "../../app-directory/app-directory-queries"
import type { AppInstance } from "../../state/types"
import type { IntentHandlerOption, IntentResolutionChoice } from "../intent-resolution-callback"
import {
  getActiveListenersForIntent,
  getInstance,
  getInstancesByAppId,
  isInstanceConnected,
} from "../../state/selectors"
import {
  isContextTypeCompatible,
  isResultTypeCompatible,
  type AppIntentLike,
} from "./intent-helpers"

export function findMatchingIntentResolutionChoice(
  choices: IntentResolutionChoice[],
  selectedHandler: AppIdentifier,
  selectedIntent?: string,
): IntentResolutionChoice | undefined {
  return choices.find(choice => {
    if (selectedIntent && choice.intent.name !== selectedIntent) {
      return false
    }
    if (choice.handler.appId !== selectedHandler.appId) {
      return false
    }
    if (selectedHandler.instanceId) {
      return choice.handler.instanceId === selectedHandler.instanceId
    }
    return choice.handler.instanceId === undefined
  })
}

/**
 * Convert resolver app list to IntentHandlerOption[] for requestIntentResolution.
 * isRunning is true when the app has an instanceId and that instance is not terminated.
 */
export function appsToIntentHandlerOptions(
  state: AgentState,
  apps: AppMetadata[],
): IntentHandlerOption[] {
  return apps.map(app => {
    const isRunning = !!app.instanceId && getInstance(state, app.instanceId) !== undefined
    return {
      ...app,
      appId: app.appId,
      name: app.name,
      version: app.version,
      instanceId: app.instanceId,
      isRunning,
    }
  })
}

function appToMetadata(
  app: DirectoryApp | undefined,
  appId: string,
  intentName: string,
  instance?: AppInstance,
): AppMetadata {
  const intentDef = app?.interop?.intents?.listensFor?.[intentName]
  const resultType = typeof intentDef?.resultType === "string" ? intentDef.resultType : undefined
  const instanceMetadata = instance?.instanceMetadata

  return {
    appId,
    name: app?.name ?? instance?.metadata.name,
    version: app?.version ?? instance?.metadata.version,
    title: app?.title ?? instance?.metadata.title,
    tooltip: app?.tooltip ?? instance?.metadata.tooltip,
    description: app?.description ?? instance?.metadata.description,
    icons: app?.icons ?? instance?.metadata.icons,
    screenshots: app?.screenshots ?? instance?.metadata.screenshots,
    resultType,
    instanceId: instance?.instanceId,
    instanceMetadata,
  }
}

/**
 * Helper to create AppIntent objects for intent resolver responses.
 * Includes running instances first, then directory apps.
 */
export function createResolverAppIntent(
  state: AgentState,
  catalog: AppDirectoryState,
  intentName: string,
  contextType?: string,
  resultType?: string,
): AppIntentLike<AppMetadata> {
  const apps: AppMetadata[] = []
  let runningListeners = getActiveListenersForIntent(state, intentName)
  if (contextType) {
    runningListeners = runningListeners.filter(listener =>
      isContextTypeCompatible(listener.contextTypes, contextType),
    )
  }

  const allApps = retrieveAllApps(catalog)
  const directoryMatches = allApps.filter(app => {
    const intents = app.interop?.intents?.listensFor
    if (!intents || typeof intents !== "object") return false
    const intentDef = intents[intentName]
    if (!intentDef || typeof intentDef !== "object" || !("contexts" in intentDef)) return false

    const contextTypes = Array.isArray(intentDef.contexts) ? intentDef.contexts : []
    if (contextType && !isContextTypeCompatible(contextTypes, contextType)) return false

    const actualResultType =
      typeof intentDef.resultType === "string" ? intentDef.resultType : undefined
    if (resultType !== undefined && !isResultTypeCompatible(actualResultType, resultType))
      return false

    return true
  })
  const displayName =
    directoryMatches
      .map(app => app.interop?.intents?.listensFor?.[intentName]?.displayName)
      .find((value): value is string => typeof value === "string" && value.length > 0) ?? intentName

  const directoryAppIds = new Set(directoryMatches.map(app => app.appId))

  // 1) Connected instances for directory apps (directory order).
  // Include running apps that declare the intent in AppD even when they have not yet
  // registered an intent listener for this intent name.
  directoryMatches.forEach(app => {
    const connectedInstances = getInstancesByAppId(state, app.appId).filter(isInstanceConnected)

    connectedInstances.forEach(instance => {
      apps.push(appToMetadata(app, app.appId, intentName, instance))
    })
  })

  // 2) Running instances for dynamic listeners not in directory (registration order).
  const validRunningListeners = runningListeners.filter(listener => {
    return getInstance(state, listener.instanceId) !== undefined
  })

  const filteredDynamicListeners =
    resultType !== undefined
      ? []
      : validRunningListeners.filter(listener => !directoryAppIds.has(listener.appId))

  filteredDynamicListeners.forEach(listener => {
    const appInfo = retrieveAppsById(catalog, listener.appId)[0]
    const instance = getInstance(state, listener.instanceId)
    apps.push(appToMetadata(appInfo, listener.appId, intentName, instance))
  })

  const runningInstanceAppIds = new Set(
    apps.filter(entry => entry.instanceId).map(entry => entry.appId),
  )

  // 3) Directory apps without running instances (directory order).
  const directoryAppsWithoutInstances = directoryMatches.filter(
    app => !runningInstanceAppIds.has(app.appId),
  )
  directoryAppsWithoutInstances.forEach(app => {
    apps.push(appToMetadata(app, app.appId, intentName))
  })

  // 4) Directory apps with running instances (directory order).
  const directoryAppsWithInstances = directoryMatches.filter(app =>
    runningInstanceAppIds.has(app.appId),
  )
  directoryAppsWithInstances.forEach(app => {
    apps.push(appToMetadata(app, app.appId, intentName))
  })

  return {
    intent: { name: intentName, displayName },
    apps,
  }
}

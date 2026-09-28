/**
 * Pure query functions over AgentState.appDirectory (catalog slice).
 */

import type { AppDirectoryState } from "../state/types"
import type { DirectoryApp, DirectoryIntent, WebAppDetails } from "./types"

function genericResultTypeSame(real: string | undefined, required: string | undefined): boolean {
  if (required === undefined) {
    return true
  }
  if (real === undefined) {
    return false
  }
  return real === required
}

function retrieveIntentsForApp(app: DirectoryApp): DirectoryIntent[] {
  const listensFor = app.interop?.intents?.listensFor
  if (!listensFor || typeof listensFor !== "object") {
    return []
  }

  return Object.entries(listensFor).map(([intentName, intentDef]) => ({
    name: intentName,
    intentName,
    appId: app.appId,
    contexts: intentDef.contexts,
    resultType: intentDef.resultType,
    displayName: intentDef.displayName,
    customConfig: intentDef.customConfig,
  }))
}

function intentMatches(
  intent: DirectoryIntent,
  contextType: string | undefined,
  intentName: string | undefined,
  resultType: string | undefined,
): boolean {
  if (intentName !== undefined && intent.intentName !== intentName) {
    return false
  }
  if (contextType !== undefined && !intent.contexts.includes(contextType)) {
    return false
  }
  if (!genericResultTypeSame(intent.resultType, resultType)) {
    return false
  }
  return true
}

export function retrieveAllApps(catalog: AppDirectoryState): DirectoryApp[] {
  return [...catalog.apps]
}

export function retrieveAppsById(catalog: AppDirectoryState, appId: string): DirectoryApp[] {
  const exactMatches = catalog.apps.filter(app => app.appId === appId)
  if (exactMatches.length > 0) {
    return exactMatches
  }

  const normalizedAppId = appId.toLowerCase()
  return catalog.apps.filter(app => app.appId.toLowerCase() === normalizedAppId)
}

export function retrieveAllIntents(catalog: AppDirectoryState): DirectoryIntent[] {
  return catalog.apps.flatMap(app => retrieveIntentsForApp(app))
}

export function retrieveIntents(
  catalog: AppDirectoryState,
  contextType: string | undefined,
  intentName: string | undefined,
  resultType: string | undefined,
): DirectoryIntent[] {
  if (contextType === undefined && intentName === undefined && resultType === undefined) {
    return retrieveAllIntents(catalog)
  }

  return catalog.apps.flatMap(app => {
    const appIntents = retrieveIntentsForApp(app)
    return appIntents.filter(intent => intentMatches(intent, contextType, intentName, resultType))
  })
}

export function retrieveApps(
  catalog: AppDirectoryState,
  contextType: string | undefined,
  intentName?: string,
  resultType?: string,
): DirectoryApp[] {
  if (contextType === undefined && intentName === undefined && resultType === undefined) {
    return [...catalog.apps]
  }

  const appIds = new Set(
    retrieveIntents(catalog, contextType, intentName ?? undefined, resultType ?? undefined).map(
      intent => intent.appId,
    ),
  )

  return catalog.apps.filter(app => appIds.has(app.appId))
}

export function retrieveAppsByUrl(catalog: AppDirectoryState, url: string): DirectoryApp[] {
  if (!url || typeof url !== "string") {
    return []
  }

  return retrieveAllApps(catalog).filter(
    app =>
      app.type === "web" &&
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- `app.details` comes from a fetched App Directory JSON response; the `WebAppDetails` cast is an assumption about a well-behaved directory, not a guarantee that `url` is present.
      (app.details as WebAppDetails)?.url === url,
  )
}

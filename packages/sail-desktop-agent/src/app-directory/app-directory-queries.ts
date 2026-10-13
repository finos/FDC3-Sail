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

/** The part of an appId before "@": `myApp@appd.example.com` -> `myApp`. */
function unqualifiedAppId(appId: string): string {
  const at = appId.indexOf("@")
  return at === -1 ? appId : appId.slice(0, at)
}

/**
 * Directory apps matching `appId`, per FDC3 3.0 "Fully-Qualified AppIds" (API spec): an exact
 * match first; then a fully-qualified id's unqualified part against known unqualified ids, or an
 * unqualified id against the unqualified part of known fully-qualified ids. A case-insensitive
 * exact match is Sail's last resort.
 */
export function retrieveAppsById(catalog: AppDirectoryState, appId: string): DirectoryApp[] {
  const exactMatches = catalog.apps.filter(app => app.appId === appId)
  if (exactMatches.length > 0) {
    return exactMatches
  }

  const unqualified = unqualifiedAppId(appId)
  const partialMatches =
    unqualified === appId
      ? catalog.apps.filter(app => unqualifiedAppId(app.appId) === appId)
      : catalog.apps.filter(app => app.appId === unqualified)
  if (partialMatches.length > 0) {
    return partialMatches
  }

  const normalizedAppId = appId.toLowerCase()
  return catalog.apps.filter(app => app.appId.toLowerCase() === normalizedAppId)
}

/**
 * The directory's own appId for `appId` (the first match from {@link retrieveAppsById}), so results
 * report the appId that was matched. Unknown ids come back unchanged.
 */
export function resolveKnownAppId(catalog: AppDirectoryState, appId: string): string {
  return retrieveAppsById(catalog, appId)[0]?.appId ?? appId
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

import type { AppDirectoryState } from "../../state/types"
import { retrieveAppsById } from "../../app-directory/app-directory-queries"
import { isContextTypeCompatible } from "./intent-helpers"

export function getDirectoryIntentsForContext(
  catalog: AppDirectoryState,
  appId: string,
  contextType: string,
): string[] {
  const appInfo = retrieveAppsById(catalog, appId)[0]
  if (!appInfo) {
    return []
  }

  const listensFor = appInfo.interop?.intents?.listensFor
  if (!listensFor || typeof listensFor !== "object") {
    return []
  }

  return Object.entries(listensFor)
    .filter(([, intentDef]) => {
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- intentDef comes from app-directory JSON; the type is an assumption about what should arrive, not a fact about what does.
      if (!intentDef || typeof intentDef !== "object" || !("contexts" in intentDef)) {
        return false
      }
      const contextTypes = Array.isArray(intentDef.contexts) ? intentDef.contexts : []
      return isContextTypeCompatible(contextTypes, contextType)
    })
    .map(([intentName]) => intentName)
}

export function isDirectoryIntentCompatible(
  catalog: AppDirectoryState,
  appId: string,
  intentName: string,
  contextType: string,
): boolean {
  return getDirectoryIntentsForContext(catalog, appId, contextType).includes(intentName)
}

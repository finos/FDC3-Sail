import { BasicDirectory, type Directory, type DirectoryApp } from "@finos/sail-headless-agent"
import type {
  SailCatalogApp,
  SailCatalogProvider,
  SailPlatformCatalog,
  SailSessionId,
} from "@finos/sail-platform"
import type { SailFdc3AppContribution, SailFdc3AppContributor } from "./api"

function toCatalogApp(app: DirectoryApp): SailCatalogApp {
  const details = app.details as { url?: string } | undefined
  const icon0 = app.icons?.[0] as { src?: string } | string | undefined
  const icon = typeof icon0 === "string" ? icon0 : icon0?.src
  return {
    appId: app.appId,
    title: app.title ?? app.appId,
    icon,
    description: app.description,
    meta: details?.url ? { url: details.url } : undefined,
  }
}

function mergeApps(contributors: Iterable<SailFdc3AppContributor>, sessionId: SailSessionId): DirectoryApp[] {
  const byId = new Map<string, DirectoryApp>()
  for (const contributor of contributors) {
    for (const app of contributor.returnApps(sessionId)) {
      byId.set(app.appId, app)
    }
  }
  return [...byId.values()]
}

/** Session-bound {@link Directory} that pulls from registered contributors. */
export function createSessionDirectory(
  appContribution: SailFdc3AppContribution,
  sessionId: SailSessionId,
): Directory {
  const apps = () => appContribution.retrieveAllApps(sessionId)
  return {
    retrieveAllApps: apps,
    retrieveApps(contextType, intentName, resultType) {
      return new BasicDirectory(apps()).retrieveApps(contextType, intentName, resultType)
    },
    retrieveAllIntents() {
      return new BasicDirectory(apps()).retrieveAllIntents()
    },
    retrieveIntents(contextType, intentName, resultType) {
      return new BasicDirectory(apps()).retrieveIntents(contextType, intentName, resultType)
    },
    retrieveAppsById(appId) {
      return new BasicDirectory(apps()).retrieveAppsById(appId)
    },
  }
}

/**
 * Registry of {@link SailFdc3AppContributor}s. Registers a catalog provider that
 * lists apps for the requested session (pull model — no launch).
 */
export function createSailFdc3AppContribution(catalog: SailPlatformCatalog): {
  appContribution: SailFdc3AppContribution
  /** Drop the catalog provider (e.g. factory shutdown). */
  dispose(): void
} {
  const sources = new Map<string, SailFdc3AppContributor>()

  const appContribution: SailFdc3AppContribution = {
    registerSource(sourceId, contributor) {
      sources.set(sourceId, contributor)
    },
    unregisterSource(sourceId) {
      sources.delete(sourceId)
    },
    retrieveAllApps(sessionId) {
      return mergeApps(sources.values(), sessionId)
    },
  }

  const provider: SailCatalogProvider = {
    list(sessionId) {
      return appContribution.retrieveAllApps(sessionId).map(toCatalogApp)
    },
  }
  catalog.addProvider(provider)

  return {
    appContribution,
    dispose() {
      catalog.removeProvider(provider)
      sources.clear()
    },
  }
}

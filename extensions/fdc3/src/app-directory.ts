import { BasicDirectory, type Directory, type DirectoryApp } from "@finos/sail-headless-agent"
import type {
  SailCatalogApp,
  SailCatalogProvider,
  SailPlatformCatalog,
} from "@finos/sail-platform"
import type { SailFdc3AppDirectory } from "./api"

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

/**
 * Mutable, source-scoped directory. Registers a catalog provider that lists
 * current DirectoryApps (pull model — no launch).
 */
export function createSailFdc3AppDirectory(catalog: SailPlatformCatalog): {
  appDirectory: SailFdc3AppDirectory
  directory: Directory
  /** Drop the catalog provider (e.g. session dispose). */
  dispose(): void
} {
  const sources = new Map<string, DirectoryApp[]>()

  function allApps(): DirectoryApp[] {
    const byId = new Map<string, DirectoryApp>()
    for (const apps of sources.values()) {
      for (const app of apps) {
        byId.set(app.appId, app)
      }
    }
    return [...byId.values()]
  }

  const provider: SailCatalogProvider = {
    list() {
      return allApps().map(toCatalogApp)
    },
  }
  catalog.addProvider(provider)

  const appDirectory: SailFdc3AppDirectory = {
    replaceSource(sourceId, apps) {
      sources.set(sourceId, apps)
    },
    removeSource(sourceId) {
      sources.delete(sourceId)
    },
    retrieveAllApps: allApps,
  }

  const directory: Directory = {
    retrieveAllApps: () => allApps(),
    retrieveApps(contextType, intentName, resultType) {
      return new BasicDirectory(allApps()).retrieveApps(contextType, intentName, resultType)
    },
    retrieveAllIntents() {
      return new BasicDirectory(allApps()).retrieveAllIntents()
    },
    retrieveIntents(contextType, intentName, resultType) {
      return new BasicDirectory(allApps()).retrieveIntents(contextType, intentName, resultType)
    },
    retrieveAppsById(appId) {
      return new BasicDirectory(allApps()).retrieveAppsById(appId)
    },
  }

  return {
    appDirectory,
    directory,
    dispose() {
      catalog.removeProvider(provider)
    },
  }
}

import { BasicDirectory, type Directory, type DirectoryApp } from "@finos/sail-headless-agent"
import {
  NEW_WINDOW,
  PANEL,
  type SailApp,
  type SailCatalogProvider,
  type SailPlatformCatalog,
  type SailWebApp,
} from "@finos/sail-platform"
import type { SailFdc3AppContribution, SailFdc3AppContributor } from "./api"

type SailHostManifest = {
  forceNewWindow?: boolean
  maxInstances?: number
  minInstances?: number
  autoStart?: boolean
  /** Hide from start-menu / catalogue UI; still launchable by appId. */
  hidden?: boolean
}

function sailHostManifest(app: DirectoryApp): SailHostManifest {
  const sail = app.hostManifests?.sail
  if (typeof sail !== "object" || sail === null) {
    return {}
  }
  return sail as SailHostManifest
}

function toCatalogApp(app: DirectoryApp): SailApp {
  const details = app.details as { url?: string } | undefined
  const icon0 = app.icons?.[0] as { src?: string } | string | undefined
  const icon = typeof icon0 === "string" ? icon0 : icon0?.src
  const sail = sailHostManifest(app)
  const base: SailApp = {
    appId: app.appId,
    title: app.title ?? app.appId,
    icon,
    description: app.description,
    ...(typeof sail.maxInstances === "number" ? { maxInstances: sail.maxInstances } : {}),
    ...(typeof sail.minInstances === "number" ? { minInstances: sail.minInstances } : {}),
    ...(typeof sail.autoStart === "boolean" ? { autoStart: sail.autoStart } : {}),
    ...(typeof sail.hidden === "boolean" ? { hidden: sail.hidden } : {}),
  }

  const url = details?.url
  if (!url) {
    return base
  }

  const web: SailWebApp = {
    ...base,
    url,
    location: sail.forceNewWindow === true ? NEW_WINDOW : PANEL,
  }
  return web
}

async function mergeApps(
  contributors: Iterable<SailFdc3AppContributor>,
): Promise<DirectoryApp[]> {
  const byId = new Map<string, DirectoryApp>()
  for (const contributor of contributors) {
    for (const app of await contributor.returnApps()) {
      byId.set(app.appId, app)
    }
  }
  return [...byId.values()]
}

/**
 * Session-bound {@link Directory} over a mutable app list.
 * Call {@link SessionDirectoryApps.refresh} before DA work so lookups see current contributors.
 */
export type SessionDirectoryApps = {
  directory: Directory
  refresh(): Promise<void>
}

export function createSessionDirectory(
  appContribution: SailFdc3AppContribution,
): SessionDirectoryApps {
  let current: DirectoryApp[] = []
  const apps = () => current
  return {
    directory: {
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
    },
    async refresh() {
      current = await appContribution.retrieveAllApps()
    },
  }
}

/**
 * Registry of {@link SailFdc3AppContributor}s. Registers a catalog provider that
 * lists apps (pull model — no launch).
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
    async retrieveAllApps() {
      return mergeApps(sources.values())
    },
  }

  const provider: SailCatalogProvider = {
    async list() {
      const apps = await appContribution.retrieveAllApps()
      return apps.map(toCatalogApp)
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

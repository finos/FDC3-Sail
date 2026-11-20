import type { SailApp, SailCatalogProvider, SailPlatformCatalog } from "./types"

export {
  NEW_WINDOW,
  PANEL,
  SIDEBAR,
  TRAY,
  type SailApp,
  type SailCatalogProvider,
  type SailPlatformCatalog,
  type SailWebApp,
  type SailWebAppLocation,
} from "./types"

/**
 * Aggregates {@link SailCatalogProvider}s. `list` merges by `appId`
 * (later providers win on conflict).
 */
export function createSailPlatformCatalog(): SailPlatformCatalog {
  const providers = new Set<SailCatalogProvider>()

  return {
    addProvider(provider) {
      providers.add(provider)
    },
    removeProvider(provider) {
      providers.delete(provider)
    },
    list() {
      const byId = new Map<string, SailApp>()
      for (const provider of providers) {
        for (const app of provider.list()) {
          byId.set(app.appId, app)
        }
      }
      return [...byId.values()]
    },
  }
}

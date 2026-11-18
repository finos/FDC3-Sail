import type { SailSessionId } from "../session/types"
import type { SailCatalogApp, SailCatalogProvider, SailPlatformCatalog } from "./types"

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
    list(sessionId: SailSessionId) {
      const byId = new Map<string, SailCatalogApp>()
      for (const provider of providers) {
        for (const app of provider.list(sessionId)) {
          byId.set(app.appId, app)
        }
      }
      return [...byId.values()]
    },
  }
}

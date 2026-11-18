import type { SailSessionId } from "../session/types"

/**
 * A known app in the start-menu catalog.
 * Presentation only — no AppD / directory concepts, no launch.
 */
export interface SailCatalogApp {
  appId: string
  title: string
  icon?: string
  description?: string
  /** Opaque host/extension extras. */
  meta?: Record<string, unknown>
}

/**
 * Supplies catalog apps for a user session.
 */
export interface SailCatalogProvider {
  list(sessionId: SailSessionId): SailCatalogApp[]
}

/**
 * sail.platform.catalog — start menu / known apps. Does not launch.
 */
export interface SailPlatformCatalog {
  addProvider(provider: SailCatalogProvider): void
  removeProvider(provider: SailCatalogProvider): void
  list(sessionId: SailSessionId): SailCatalogApp[]
}

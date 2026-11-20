/**
 * A known app in the start-menu catalog.
 * Presentation only — no AppD / directory concepts, no launch.
 */
export interface SailApp {
  appId: string
  title: string
  icon?: string
  description?: string
  /** Upper bound on concurrent instances of this app. */
  maxInstances?: number
  /** Lower bound on concurrent instances of this app. */
  minInstances?: number
  /** When true, the host should launch this app as the session starts. */
  autoStart?: boolean
  /**
   * When true, omit from start-menu / catalogue UI. Still launchable by `appId`
   * (deep link, FDC3 open, intents). Set via `hostManifests.sail.hidden`.
   */
  hidden?: boolean
}

/** Open the app in a new browser / OS window. */
export const NEW_WINDOW = "new-window" as const
/** Open the app in a workspace panel (default). */
export const PANEL = "panel" as const
/** Open the app in a sidebar region. */
export const SIDEBAR = "sidebar" as const
/** Open the app in a tray / utility region. */
export const TRAY = "tray" as const

export type SailWebAppLocation =
  | typeof NEW_WINDOW
  | typeof PANEL
  | typeof SIDEBAR
  | typeof TRAY

/**
 * Catalog app that launches a web URL.
 * {@link location} defaults to {@link PANEL} when omitted.
 */
export interface SailWebApp extends SailApp {
  url: string
  location?: SailWebAppLocation
}

/**
 * Supplies catalog apps for the single user.
 * Sync or async — platform `list()` always awaits providers.
 */
export interface SailCatalogProvider {
  list(): SailApp[] | Promise<SailApp[]>
}

/**
 * sail.platform.catalog — start menu / known apps. Does not launch.
 */
export interface SailPlatformCatalog {
  addProvider(provider: SailCatalogProvider): void
  removeProvider(provider: SailCatalogProvider): void
  /** Resolves apps from all providers (awaiting any async providers). */
  list(): Promise<SailApp[]>
}

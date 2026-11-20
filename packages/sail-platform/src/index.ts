// ============================================================================
// @finos/sail-platform
// ============================================================================

// Capability + UI extension-point ids
export {
  SAIL_PLATFORM_BUS,
  SAIL_PLATFORM_CATALOG,
  SAIL_PLATFORM_SESSION,
  SAIL_PLATFORM_STORAGE,
  SAIL_UI_APP_BAR,
  SAIL_UI_CONFIG,
  SAIL_UI_HIDDEN,
  getAppBarProperties,
  type SailUiAppBarProperties,
} from "./ids"

// Session (sail.platform.session → SessionService)
export {
  createSessionService,
  type AppInstanceId,
  type CreateSessionServiceOptions,
  type Placement,
  type SailAppInstance,
  type SailOpenAppRequest,
  type SailUserSession,
  type SailUserSessionSnapshot,
  type SessionService,
} from "./session"

// Bus (sail.platform.bus)
export {
  createSailPlatformBus,
  SERVER_INSTANCE,
  type BusPeerId,
  type SailBusMessageHandler,
  type SailPlatformBus,
} from "./bus"

// Catalog (sail.platform.catalog)
export {
  createSailPlatformCatalog,
  NEW_WINDOW,
  PANEL,
  SIDEBAR,
  TRAY,
  type SailApp,
  type SailCatalogProvider,
  type SailPlatformCatalog,
  type SailWebApp,
  type SailWebAppLocation,
} from "./catalog"

// Storage — hosts export SailUserStorage as sail.platform.storage
export {
  createLocalUserStorage,
  createMemoryUserStorage,
  type LocalUserStorageOptions,
  type SailStorageChange,
  type SailStorageChangeListener,
  type SailUserStorage,
  createChangeEmitter,
} from "./storage"

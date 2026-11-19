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
  createSailUserSession,
  createSessionService,
  setContainerLocation,
  type Container,
  type CreateSailUserSessionOptions,
  type CreateSessionServiceOptions,
  type Geometry as SessionGeometry,
  type GeometryMode,
  type LocationDetails,
  type Panel as SessionPanel,
  type Placement,
  type Rect,
  type AppInstanceId,
  type SailAppInstance,
  type SailOpenAppRequest,
  type SailSessionId,
  type SailUserSession,
  type SailUserSessionHostHooks,
  type SailUserSessionSnapshot,
  type SessionService,
  type Tab as SessionTab,
  type Workspace as SessionWorkspace,
  type WorkspaceSummary as SessionWorkspaceSummary,
} from "./session"

// Bus (sail.platform.bus)
export {
  createSailPlatformBus,
  SERVER_INSTANCE,
  type BusPeerId,
  type SailBusMessageHandler,
  type SailPlatformBus,
  type SailSessionBus,
  type SailSessionBusMessageHandler,
} from "./bus"

// Catalog (sail.platform.catalog)
export {
  createSailPlatformCatalog,
  type SailCatalogApp,
  type SailCatalogProvider,
  type SailPlatformCatalog,
} from "./catalog"

// Storage (sail.platform.storage → SailStorage)
export {
  createLocalUserStorage,
  createMemoryUserStorage,
  createSailStorage,
  type CreateSailStorageOptions,
  type LocalUserStorageOptions,
  type SailStorage,
  type SailStorageChange,
  type SailStorageChangeListener,
  type SailUserStorage,
  createChangeEmitter,
} from "./storage"

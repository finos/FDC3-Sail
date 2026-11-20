// ============================================================================
// SESSION — containers + running apps (single user)
// ============================================================================
//
// SailUserSession tracks opaque UI containers and app instances. Arrangement
// policy (tabs, docks, windows) is owned by each Sail UI. Optional typed
// containers (Workspace, Tab, Panel, Geometry) extend Container for hosts
// that want a shared vocabulary.
//
// ============================================================================

/** Id of a running app inside the session. */
export type AppInstanceId = string

/** Opaque to platform: parentage, kind, geometry, UI-specific fields. */
export type LocationDetails = Record<string, unknown>

/** Opaque to platform: where an app sits inside its container. */
export type Placement = Record<string, unknown>

/** Base UI containment unit. Session only requires id + location. */
export interface Container {
  id: string
  location: LocationDetails
}

/** Position and size, used when a Geometry container uses the `rects` lane. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * How arrangement is stored on a Geometry container.
 * - `renderer` — opaque layout-library state in `state`
 * - `rects` — coordinates live on related Panel containers / placement
 */
export type GeometryMode = { mode: "renderer"; state: unknown } | { mode: "rects" }

/** Optional typed container: named saveable set of apps. */
export interface Workspace extends Container {
  name: string
  /** Epoch milliseconds of the last successful save. */
  savedAt: number
}

/** Optional typed container: a tab / group of panels. */
export interface Tab extends Container {
  name: string
  icon?: string
  background?: string
}

/** Optional typed container: one chrome slot (or app chrome metadata). */
export interface Panel extends Container {
  appId?: string
  title?: string
  url?: string
  icon?: string
  rect?: Rect
  meta?: Record<string, unknown>
}

/** Optional typed container: layout geometry lane. */
export interface Geometry extends Container {
  geometry: GeometryMode
}

/** Enough to render a workspace picker without loading full detail. */
export interface WorkspaceSummary {
  id: string
  name: string
  savedAt: number
}

/** One running app instance in the session. */
export interface SailAppInstance {
  instanceId: AppInstanceId
  appId: string
  /** Container that hosts this app. */
  within: string
  placement?: Placement
}

export interface SailOpenAppRequest {
  appId: string
  /** Container id; omit only if the host has a default container. */
  within?: string
  placement?: Placement
  /** Mount URL when known (web hosts). Stored in placement/meta by host if needed. */
  url?: string
  title?: string
  icon?: string
}

export interface SailUserSessionSnapshot {
  containers: Container[]
  apps: SailAppInstance[]
}

/**
 * The single user session: containers + running apps.
 * Obtained from {@link SessionService.getSession} / {@link SessionService.getSessionByApp}.
 */
export interface SailUserSession {
  getSnapshot(): SailUserSessionSnapshot
  subscribe(listener: () => void): () => void

  createContainer(id: string, location: LocationDetails): Container
  updateContainer(id: string, location: LocationDetails): void
  destroyContainer(id: string): void

  openApp(request: SailOpenAppRequest): Promise<AppInstanceId>
  closeApp(instanceId: AppInstanceId): Promise<void>

  /** Associate an iframe/popup Window with a running instance (browser hosts). */
  registerHostWindow(windowRef: Window, instanceId: AppInstanceId): void
  /** Drop the Window association for an instance. */
  unregisterHostWindow(instanceId: AppInstanceId): void
  getInstanceIdForHostWindow(windowRef: Window): AppInstanceId | undefined
  getHostWindow(instanceId: AppInstanceId): Window | undefined
}

/**
 * sail.platform.session — single-user session registry.
 */
export interface SessionService {
  /** The single user session, if created. */
  getSession(): SailUserSession | undefined
  getSessionByApp(appInstanceId: AppInstanceId): SailUserSession | undefined
  /**
   * Notify when the session is created. If already created, the listener is
   * invoked immediately.
   */
  onSession(listener: (session: SailUserSession) => void): () => void
}

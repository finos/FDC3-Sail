// ============================================================================
// SESSION — running apps (single user)
// ============================================================================
//
// SailUserSession tracks app instances. Arrangement policy (tabs, docks,
// windows) and persistence are owned by each Sail UI's session implementation.
//
// ============================================================================

/** Id of a running app inside the session. */
export type AppInstanceId = string

/** Opaque to platform: where an app sits inside its UI (shell-specific). */
export type Placement = Record<string, unknown>

/** One running app instance in the session. */
export interface SailAppInstance {
  instanceId: AppInstanceId
  appId: string
  placement?: Placement
}

export interface SailOpenAppRequest {
  appId: string
  placement?: Placement
  /** Mount URL when known (web hosts). */
  url?: string
  title?: string
  icon?: string
}

export interface SailUserSessionSnapshot {
  apps: SailAppInstance[]
}

/**
 * The single user session: running apps + host Window associations.
 * Obtained from {@link SessionService.getSession} / {@link SessionService.getSessionByApp}.
 * Shells provide a concrete implementation that owns open/close UI and layout storage.
 */
export interface SailUserSession {
  getSnapshot(): SailUserSessionSnapshot
  subscribe(listener: () => void): () => void

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

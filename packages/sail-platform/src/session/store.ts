import type {
  AppInstanceId,
  Container,
  LocationDetails,
  SailAppInstance,
  SailOpenAppRequest,
  SailUserSession,
  SailUserSessionSnapshot,
  SessionService,
} from "./types"

export type SailUserSessionHostHooks = {
  /**
   * Called after the session registers a pending app. Host mounts UI
   * (iframe/window/panel). Throw to abort open.
   */
  onOpenApp?: (request: SailOpenAppRequest, instanceId: AppInstanceId) => Promise<void>
  /**
   * Called before the session drops the instance. Host tears down UI.
   */
  onCloseApp?: (instanceId: AppInstanceId, app: SailAppInstance) => Promise<void>
}

export type CreateSailUserSessionOptions = {
  /** App instance id factory; default random UUID. */
  createAppInstanceId?: () => AppInstanceId
  host?: SailUserSessionHostHooks
}

export type CreateSessionServiceOptions = {
  createAppInstanceId?: () => AppInstanceId
}

/**
 * Process-level single-user session registry. Hosts export this as `sail.platform.session`.
 * Use {@link createSession} once; app ids are tracked from the session snapshot.
 */
export function createSessionService(
  options?: CreateSessionServiceOptions,
): SessionService & {
  createSession(sessionOptions?: CreateSailUserSessionOptions): SailUserSession
} {
  let session: SailUserSession | undefined
  const byAppId = new Map<AppInstanceId, SailUserSession>()
  const sessionListeners = new Set<(session: SailUserSession) => void>()
  const createAppInstanceId = options?.createAppInstanceId ?? (() => crypto.randomUUID())

  return {
    getSession() {
      return session
    },
    getSessionByApp(appInstanceId) {
      return byAppId.get(appInstanceId)
    },
    onSession(listener) {
      sessionListeners.add(listener)
      if (session) {
        listener(session)
      }
      return () => {
        sessionListeners.delete(listener)
      }
    },
    createSession(sessionOptions) {
      if (session) {
        throw new Error("sail.platform.session already has a user session")
      }
      const created = createSailUserSession({
        createAppInstanceId: sessionOptions?.createAppInstanceId ?? createAppInstanceId,
        host: sessionOptions?.host,
      })
      session = created
      const sync = () => {
        const live = new Set(created.getSnapshot().apps.map(a => a.instanceId))
        for (const [id, owner] of [...byAppId.entries()]) {
          if (owner === created && !live.has(id)) {
            byAppId.delete(id)
          }
        }
        for (const app of created.getSnapshot().apps) {
          byAppId.set(app.instanceId, created)
        }
      }
      created.subscribe(sync)
      sync()
      for (const listener of [...sessionListeners]) {
        listener(created)
      }
      return created
    },
  }
}

export function createSailUserSession(options?: CreateSailUserSessionOptions): SailUserSession {
  const createAppInstanceId = options?.createAppInstanceId ?? (() => crypto.randomUUID())
  const host = options?.host

  const containers = new Map<string, Container>()
  const apps = new Map<AppInstanceId, SailAppInstance>()
  const listeners = new Set<() => void>()

  /** Window ↔ instance map owned by this session (browser hosts). */
  const windowsByInstance = new Map<AppInstanceId, WeakRef<Window>>()
  const instanceByWindow = new WeakMap<Window, AppInstanceId>()

  function forgetWindow(instanceId: AppInstanceId): void {
    const ref = windowsByInstance.get(instanceId)
    windowsByInstance.delete(instanceId)
    const win = ref?.deref()
    if (win) {
      instanceByWindow.delete(win)
    }
  }

  let snapshot: SailUserSessionSnapshot = { containers: [], apps: [] }

  function emit() {
    snapshot = {
      containers: [...containers.values()],
      apps: [...apps.values()],
    }
    for (const listener of [...listeners]) {
      listener()
    }
  }

  const userSession: SailUserSession = {
    getSnapshot() {
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    createContainer(containerId, location) {
      if (containers.has(containerId)) {
        throw new Error(`Container already exists: ${containerId}`)
      }
      const container: Container = { id: containerId, location: { ...location } }
      containers.set(containerId, container)
      emit()
      return container
    },

    updateContainer(containerId, location) {
      const existing = containers.get(containerId)
      if (!existing) {
        throw new Error(`Unknown container: ${containerId}`)
      }
      containers.set(containerId, { ...existing, location: { ...location } })
      emit()
    },

    destroyContainer(containerId) {
      if (!containers.has(containerId)) {
        return
      }
      for (const [instanceId, app] of [...apps.entries()]) {
        if (app.within === containerId) {
          apps.delete(instanceId)
          forgetWindow(instanceId)
        }
      }
      containers.delete(containerId)
      emit()
    },

    async openApp(request) {
      const within = request.within
      if (within !== undefined && !containers.has(within)) {
        throw new Error(`Unknown container for openApp: ${within}`)
      }
      const instanceId = createAppInstanceId()
      const app: SailAppInstance = {
        instanceId,
        appId: request.appId,
        within: within ?? "",
        placement: request.placement ? { ...request.placement } : undefined,
      }
      if (request.url || request.title || request.icon) {
        app.placement = {
          ...app.placement,
          ...(request.url ? { url: request.url } : {}),
          ...(request.title ? { title: request.title } : {}),
          ...(request.icon ? { icon: request.icon } : {}),
        }
      }
      apps.set(instanceId, app)
      emit()
      try {
        await host?.onOpenApp?.(request, instanceId)
      } catch (err) {
        apps.delete(instanceId)
        emit()
        throw err
      }
      return instanceId
    },

    async closeApp(instanceId) {
      const app = apps.get(instanceId)
      if (!app) {
        return
      }
      await host?.onCloseApp?.(instanceId, app)
      apps.delete(instanceId)
      forgetWindow(instanceId)
      emit()
    },

    registerHostWindow(windowRef, instanceId) {
      windowsByInstance.set(instanceId, new WeakRef(windowRef))
      instanceByWindow.set(windowRef, instanceId)
    },
    unregisterHostWindow(instanceId) {
      forgetWindow(instanceId)
    },
    getInstanceIdForHostWindow(windowRef) {
      return instanceByWindow.get(windowRef)
    },
    getHostWindow(instanceId) {
      return windowsByInstance.get(instanceId)?.deref()
    },
  }

  emit()
  return userSession
}

/** Helper for hosts that need to mutate location without replacing the API. */
export function setContainerLocation(
  session: SailUserSession,
  id: string,
  location: LocationDetails,
): void {
  session.updateContainer(id, location)
}

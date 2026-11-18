import type {
  AppInstanceId,
  Container,
  LocationDetails,
  SailAppInstance,
  SailOpenAppRequest,
  SailSessionId,
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
  /** Session id; default random UUID. */
  sessionId?: SailSessionId
  /** App instance id factory; default random UUID. */
  createAppInstanceId?: () => AppInstanceId
  host?: SailUserSessionHostHooks
}

export type CreateSessionServiceOptions = {
  createSessionId?: () => SailSessionId
  createAppInstanceId?: () => AppInstanceId
}

/**
 * Process-level session registry. Hosts export this as `sail.platform.session`.
 * Use {@link createSession} for each user session; app ids are tracked from the
 * session snapshot (openApp / closeApp / destroyContainer).
 */
export function createSessionService(
  options?: CreateSessionServiceOptions,
): SessionService & {
  createSession(sessionOptions?: CreateSailUserSessionOptions): SailUserSession
} {
  const bySessionId = new Map<SailSessionId, SailUserSession>()
  const byAppId = new Map<AppInstanceId, SailUserSession>()
  const sessionListeners = new Set<(session: SailUserSession) => void>()
  const createSessionId = options?.createSessionId ?? (() => crypto.randomUUID())
  const createAppInstanceId = options?.createAppInstanceId ?? (() => crypto.randomUUID())

  return {
    getSession(sessionId) {
      return bySessionId.get(sessionId)
    },
    getSessionByApp(appInstanceId) {
      return byAppId.get(appInstanceId)
    },
    getSessions() {
      return [...bySessionId.values()]
    },
    onSession(listener) {
      sessionListeners.add(listener)
      return () => {
        sessionListeners.delete(listener)
      }
    },
    createSession(sessionOptions) {
      const session = createSailUserSession({
        sessionId: sessionOptions?.sessionId ?? createSessionId(),
        createAppInstanceId: sessionOptions?.createAppInstanceId ?? createAppInstanceId,
        host: sessionOptions?.host,
      })
      bySessionId.set(session.id, session)
      const sync = () => {
        const live = new Set(session.getSnapshot().apps.map(a => a.instanceId))
        for (const [id, owner] of [...byAppId.entries()]) {
          if (owner === session && !live.has(id)) {
            byAppId.delete(id)
          }
        }
        for (const app of session.getSnapshot().apps) {
          byAppId.set(app.instanceId, session)
        }
      }
      session.subscribe(sync)
      sync()
      for (const listener of [...sessionListeners]) {
        listener(session)
      }
      return session
    },
  }
}

export function createSailUserSession(options?: CreateSailUserSessionOptions): SailUserSession {
  const id = options?.sessionId ?? crypto.randomUUID()
  const createAppInstanceId = options?.createAppInstanceId ?? (() => crypto.randomUUID())
  const host = options?.host

  const containers = new Map<string, Container>()
  const apps = new Map<AppInstanceId, SailAppInstance>()
  const listeners = new Set<() => void>()

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

  const session: SailUserSession = {
    id,
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
      emit()
    },
  }

  emit()
  return session
}

/** Helper for hosts that need to mutate location without replacing the API. */
export function setContainerLocation(
  session: SailUserSession,
  id: string,
  location: LocationDetails,
): void {
  session.updateContainer(id, location)
}

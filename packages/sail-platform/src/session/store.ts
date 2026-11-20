import type {
  AppInstanceId,
  SailUserSession,
  SessionService,
} from "./types"

export type CreateSessionServiceOptions = {
  /** Unused — kept for call-site compatibility; shells own instance id factories. */
  createAppInstanceId?: () => AppInstanceId
}

/**
 * Process-level single-user session registry. Hosts export this as `sail.platform.session`.
 * Shells construct a concrete {@link SailUserSession}, then register it via {@link createSession}.
 */
export function createSessionService(
  _options?: CreateSessionServiceOptions,
): SessionService & {
  createSession(session: SailUserSession): SailUserSession
} {
  let session: SailUserSession | undefined
  const byAppId = new Map<AppInstanceId, SailUserSession>()
  const sessionListeners = new Set<(session: SailUserSession) => void>()

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
    createSession(created) {
      if (session) {
        throw new Error("sail.platform.session already has a user session")
      }
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

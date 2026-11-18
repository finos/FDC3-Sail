/**
 * sail.platform.bus — in-process pub/sub between host and extensions.
 */
import type { AppInstanceId, SailSessionId, SailUserSession } from "../session/types"

export type { AppInstanceId, SailSessionId }

/**
 * Peer id for bus traffic addressed to the Desktop Agent / server (app → DA).
 * App-bound traffic uses a concrete {@link AppInstanceId} instead.
 */
export const SERVER_INSTANCE = "sail.SERVER_INSTANCE" as const

export type BusPeerId = AppInstanceId | typeof SERVER_INSTANCE

export type SailBusMessageHandler = (
  message: object,
  sessionId: SailSessionId,
  instanceId: BusPeerId,
) => void | Promise<void>

export type SailSessionBusMessageHandler = (
  message: object,
  instanceId: BusPeerId,
) => void | Promise<void>

/**
 * Session-scoped bus: `post` / `subscribe` / `log` for one {@link SailUserSession}.
 * Peer is an {@link AppInstanceId} or {@link SERVER_INSTANCE}.
 */
export interface SailSessionBus {
  log(message: string): void
  post(message: object, instanceId: BusPeerId): Promise<void>
  subscribe(handler: SailSessionBusMessageHandler): () => void
}

export interface SailPlatformBus {
  log(message: string): void
  /** Publish to all {@link subscribe} handlers. */
  post(message: object, sessionId: SailSessionId, instanceId: BusPeerId): Promise<void>
  /** Listen for {@link post}s. Returns a dispose function. */
  subscribe(handler: SailBusMessageHandler): () => void
  /**
   * View limited to {@link session}.
   * `post` / `log` still go to this bus (with `session.id`); `subscribe` only
   * sees that session's traffic.
   */
  forSession(session: SailUserSession): SailSessionBus
}

function createSessionBus(parent: SailPlatformBus, session: SailUserSession): SailSessionBus {
  return {
    log: message => parent.log(message),
    post: (message, instanceId) => parent.post(message, session.id, instanceId),
    subscribe(handler) {
      return parent.subscribe((message, sessionId, instanceId) => {
        if (sessionId !== session.id) {
          return
        }
        return handler(message, instanceId)
      })
    },
  }
}

/**
 * In-memory bus. Hosts `post` inbound app messages; extensions `subscribe`.
 */
export function createSailPlatformBus(): SailPlatformBus {
  const handlers = new Set<SailBusMessageHandler>()

  const bus: SailPlatformBus = {
    log: message => console.log(message),
    async post(message, sessionId, instanceId) {
      for (const handler of [...handlers]) {
        await handler(message, sessionId, instanceId)
      }
    },
    subscribe(handler) {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },
    forSession(session) {
      return createSessionBus(bus, session)
    },
  }

  return bus
}

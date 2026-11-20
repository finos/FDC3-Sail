/**
 * sail.platform.bus — in-process pub/sub between host and extensions (single user).
 */
import type { AppInstanceId } from "../session/types"

export type { AppInstanceId }

/**
 * Peer id for bus traffic addressed to the Desktop Agent / server (app → DA).
 * App-bound traffic uses a concrete {@link AppInstanceId} instead.
 */
export const SERVER_INSTANCE = "sail.SERVER_INSTANCE" as const

export type BusPeerId = AppInstanceId | typeof SERVER_INSTANCE

export type SailBusMessageHandler = (
  message: object,
  instanceId: BusPeerId,
) => void | Promise<void>

export interface SailPlatformBus {
  log(message: string): void
  /** Publish to all {@link subscribe} handlers. */
  post(message: object, instanceId: BusPeerId): Promise<void>
  /** Listen for {@link post}s. Returns a dispose function. */
  subscribe(handler: SailBusMessageHandler): () => void
}

/**
 * In-memory bus. Hosts `post` inbound app messages; extensions `subscribe`.
 */
export function createSailPlatformBus(): SailPlatformBus {
  const handlers = new Set<SailBusMessageHandler>()

  return {
    log: message => console.log(message),
    async post(message, instanceId) {
      for (const handler of [...handlers]) {
        await handler(message, instanceId)
      }
    },
    subscribe(handler) {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },
  }
}

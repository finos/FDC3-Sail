import type { SailSessionId } from "../session/types"
import { createMemoryUserStorage } from "./memory"
import type { SailStorage, SailUserStorage } from "./types"

export type CreateSailStorageOptions = {
  /**
   * Build storage the first time {@link ensureUserStorage} sees a session id.
   * Browser hosts: wrap {@link createLocalUserStorage} with a per-session prefix.
   * sail-v2-web: return a proxy that RPCs get/set/list to the browser.
   */
  createUserStorage?: (sessionId: SailSessionId) => SailUserStorage
}

/**
 * Process-level storage registry. Hosts export this as `sail.platform.storage`.
 */
export function createSailStorage(
  options?: CreateSailStorageOptions,
): SailStorage & {
  /** Register or replace storage for a session. */
  setUserStorage(sessionId: SailSessionId, storage: SailUserStorage): void
  /** Create (via options) and register storage if missing. */
  ensureUserStorage(sessionId: SailSessionId): SailUserStorage
  removeUserStorage(sessionId: SailSessionId): void
} {
  const bySession = new Map<SailSessionId, SailUserStorage>()
  const create =
    options?.createUserStorage ?? ((_sessionId: SailSessionId) => createMemoryUserStorage())

  return {
    getUserStorage(sessionId) {
      return bySession.get(sessionId)
    },
    setUserStorage(sessionId, storage) {
      bySession.set(sessionId, storage)
    },
    ensureUserStorage(sessionId) {
      let storage = bySession.get(sessionId)
      if (!storage) {
        storage = create(sessionId)
        bySession.set(sessionId, storage)
      }
      return storage
    },
    removeUserStorage(sessionId) {
      bySession.delete(sessionId)
    },
  }
}

import { createChangeEmitter } from "./change"
import type { SailUserStorage } from "./types"

/**
 * Configuration for a browser `Storage`-backed {@link SailUserStorage}.
 */
export interface LocalUserStorageOptions {
  /**
   * Prefix applied to every key, so several Sail hosts can share one origin
   * without colliding. Stripped again by {@link SailUserStorage.list}.
   * @defaultValue "sail_"
   */
  keyPrefix?: string

  /**
   * Backing `Storage` implementation.
   * @defaultValue `globalThis.localStorage`
   * Browser hosts may pass `sessionStorage` when tab-scoped state is enough.
   */
  backing?: Storage

  /** Log read failures instead of swallowing them. */
  debug?: boolean
}

/**
 * {@link SailUserStorage} over a synchronous browser `Storage` —
 * `localStorage` by default (or `sessionStorage` / any `Storage`-shaped object).
 *
 * Reads never throw: a corrupt or unreadable value resolves to `null`.
 */
export function createLocalUserStorage(options?: LocalUserStorageOptions): SailUserStorage {
  const keyPrefix = options?.keyPrefix ?? "sail_"
  const backing = options?.backing ?? globalThis.localStorage
  const debug = options?.debug ?? false
  const changes = createChangeEmitter()

  const scoped = (key: string): string => `${keyPrefix}${key}`

  return {
    get<T>(key: string): Promise<T | null> {
      try {
        const item = backing.getItem(scoped(key))
        return Promise.resolve(item === null ? null : (JSON.parse(item) as T))
      } catch (error) {
        if (debug) {
          console.error(`[SailUserStorage] cannot read ${scoped(key)}:`, error)
        }
        return Promise.resolve(null)
      }
    },

    set<T>(key: string, value: T): Promise<void> {
      backing.setItem(scoped(key), JSON.stringify(value))
      changes.notify({ key, op: "set" })
      return Promise.resolve()
    },

    remove(key: string): Promise<void> {
      backing.removeItem(scoped(key))
      changes.notify({ key, op: "remove" })
      return Promise.resolve()
    },

    list(prefix?: string): Promise<string[]> {
      const scope = scoped(prefix ?? "")
      const keys: string[] = []

      for (let index = 0; index < backing.length; index++) {
        const key = backing.key(index)
        if (key !== null && key.startsWith(scope)) {
          keys.push(key.slice(keyPrefix.length))
        }
      }

      return Promise.resolve(keys)
    },

    onChange: changes.onChange,
  }
}

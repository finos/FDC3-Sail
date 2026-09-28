import type { SailStorage } from "./types"

/**
 * Configuration for the `Storage`-backed {@link SailStorage} implementation.
 */
export interface LocalStorageOptions {
  /**
   * Prefix applied to every key, so several Sail hosts can share one origin
   * without colliding. Stripped again by {@link SailStorage.list}.
   * @defaultValue "sail_"
   */
  keyPrefix?: string

  /**
   * Backing `Storage` implementation.
   * @defaultValue `globalThis.localStorage`
   */
  backing?: Storage

  /** Log read failures instead of swallowing them. */
  debug?: boolean
}

/**
 * {@link SailStorage} over a synchronous `Storage` — browser `localStorage` by
 * default, or any `Storage`-shaped object.
 *
 * Reads never throw: a corrupt or unreadable value resolves to `null` so a bad
 * entry cannot stop a host from booting.
 *
 * @example
 * ```typescript
 * const storage = createLocalStorage({ keyPrefix: "sail_one_" })
 * await storage.set("workspace:default", workspace)
 * ```
 */
export function createLocalStorage(options?: LocalStorageOptions): SailStorage {
  const keyPrefix = options?.keyPrefix ?? "sail_"
  const backing = options?.backing ?? globalThis.localStorage
  const debug = options?.debug ?? false

  const scoped = (key: string): string => `${keyPrefix}${key}`

  return {
    get<T>(key: string): Promise<T | null> {
      try {
        const item = backing.getItem(scoped(key))
        return Promise.resolve(item === null ? null : (JSON.parse(item) as T))
      } catch (error) {
        if (debug) {
          console.error(`[SailStorage] cannot read ${scoped(key)}:`, error)
        }
        return Promise.resolve(null)
      }
    },

    set<T>(key: string, value: T): Promise<void> {
      backing.setItem(scoped(key), JSON.stringify(value))
      return Promise.resolve()
    },

    remove(key: string): Promise<void> {
      backing.removeItem(scoped(key))
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
  }
}

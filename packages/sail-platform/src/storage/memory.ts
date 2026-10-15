import type { SailStorage } from "./types"

/**
 * In-memory {@link SailStorage}, for tests and hosts with no `localStorage`.
 *
 * Values are serialised on write, so a caller holding a reference to the object
 * it stored cannot mutate what comes back out.
 */
export function createMemoryStorage(): SailStorage {
  const entries = new Map<string, string>()

  return {
    get<T>(key: string): Promise<T | null> {
      const item = entries.get(key)
      return Promise.resolve(item === undefined ? null : (JSON.parse(item) as T))
    },

    set<T>(key: string, value: T): Promise<void> {
      entries.set(key, JSON.stringify(value))
      return Promise.resolve()
    },

    remove(key: string): Promise<void> {
      entries.delete(key)
      return Promise.resolve()
    },

    list(prefix?: string): Promise<string[]> {
      const scope = prefix ?? ""
      return Promise.resolve([...entries.keys()].filter(key => key.startsWith(scope)))
    },
  }
}

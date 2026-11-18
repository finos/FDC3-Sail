import { createChangeEmitter } from "./change"
import type { SailUserStorage } from "./types"

/**
 * In-memory {@link SailUserStorage}, for tests and hosts with no browser Storage.
 *
 * Values are serialised on write, so a caller holding a reference to the object
 * it stored cannot mutate what comes back out.
 */
export function createMemoryUserStorage(): SailUserStorage {
  const entries = new Map<string, string>()
  const changes = createChangeEmitter()

  return {
    get<T>(key: string): Promise<T | null> {
      const item = entries.get(key)
      return Promise.resolve(item === undefined ? null : (JSON.parse(item) as T))
    },

    set<T>(key: string, value: T): Promise<void> {
      entries.set(key, JSON.stringify(value))
      changes.notify({ key, op: "set" })
      return Promise.resolve()
    },

    remove(key: string): Promise<void> {
      entries.delete(key)
      changes.notify({ key, op: "remove" })
      return Promise.resolve()
    },

    list(prefix?: string): Promise<string[]> {
      const scope = prefix ?? ""
      return Promise.resolve([...entries.keys()].filter(key => key.startsWith(scope)))
    },

    onChange: changes.onChange,
  }
}

/**
 * Storage port for Sail platform state.
 *
 * The default implementation is browser `localStorage` (`createLocalStorage`).
 * Supply your own object to push state to a remote service — nothing in the
 * platform assumes the backing store is local, or that reads are cheap.
 *
 * Keys are opaque strings. The platform namespaces its own keys; a host may
 * store anything alongside them.
 */
export interface SailStorage {
  /** Read a value, or `null` when the key is absent or cannot be read. */
  get<T>(key: string): Promise<T | null>

  /** Write a value, replacing anything previously stored under `key`. */
  set<T>(key: string, value: T): Promise<void>

  /** Remove a key. Removing an absent key is not an error. */
  remove(key: string): Promise<void>

  /**
   * List stored keys, optionally restricted to those starting with `prefix`.
   *
   * Required for listing saved workspaces without loading them.
   */
  list(prefix?: string): Promise<string[]>
}

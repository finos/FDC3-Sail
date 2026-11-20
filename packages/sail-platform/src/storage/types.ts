import type { SailStorageChangeListener } from "./change"

export type { SailStorageChange, SailStorageChangeListener } from "./change"

/**
 * Per-user key/value storage (the single Sail desktop user).
 *
 * Browser hosts (sail-one, sail-finance) typically back this with
 * `localStorage` / `sessionStorage`. Node hosts (sail-v2-web) proxy to the
 * browser — the platform only defines the port.
 *
 * Hosts export a {@link SailUserStorage} instance as `sail.platform.storage`.
 */
export interface SailUserStorage {
  /** Read a value, or `null` when the key is absent or cannot be read. */
  get<T>(key: string): Promise<T | null>

  /** Write a value, replacing anything previously stored under `key`. */
  set<T>(key: string, value: T): Promise<void>

  /** Remove a key. Removing an absent key is not an error. */
  remove(key: string): Promise<void>

  /**
   * List stored keys, optionally restricted to those starting with `prefix`.
   */
  list(prefix?: string): Promise<string[]>

  /**
   * Subscribe to key changes from {@link set} / {@link remove}.
   * Returns an unsubscribe function.
   */
  onChange(listener: SailStorageChangeListener): () => void
}

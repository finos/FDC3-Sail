/**
 * Change notification for {@link import("./types").SailUserStorage}.
 */
export type SailStorageChange = {
  key: string
  op: "set" | "remove"
}

export type SailStorageChangeListener = (change: SailStorageChange) => void

/** Shared subscribe/notify helper for storage adapters. */
export function createChangeEmitter(): {
  onChange(listener: SailStorageChangeListener): () => void
  notify(change: SailStorageChange): void
} {
  const listeners = new Set<SailStorageChangeListener>()
  return {
    onChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    notify(change) {
      for (const listener of listeners) {
        try {
          listener(change)
        } catch (error) {
          console.error("[SailUserStorage] onChange listener failed:", error)
        }
      }
    },
  }
}

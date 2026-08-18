import { useSyncExternalStore } from "react"
import { getClientState, getServerState } from "./index"

// The client/host stores mutate in place, so React can't detect changes by
// reference. We bump a version counter on every state-change callback and use
// that as the snapshot for useSyncExternalStore.
let version = 0
let wired = false
const listeners = new Set<() => void>()

function ensureWired(): void {
  if (wired) {
    return
  }
  wired = true
  const bump = () => {
    version++
    listeners.forEach(listener => listener())
  }
  getClientState().addStateChangeCallback(bump)
  getServerState().addStateChangeCallback(bump)
}

function subscribe(onStoreChange: () => void): () => void {
  ensureWired()
  listeners.add(onStoreChange)
  return () => listeners.delete(onStoreChange)
}

function getSnapshot(): number {
  return version
}

/**
 * Re-render the calling component whenever Sail client or host state changes.
 * Returns the current change version (rarely needed directly).
 */
export function useSailState(): number {
  return useSyncExternalStore(subscribe, getSnapshot)
}

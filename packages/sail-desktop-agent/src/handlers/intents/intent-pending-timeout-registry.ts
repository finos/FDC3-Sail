/**
 * Tracks pending-intent raise/delivery timeout handles so Cucumber can clear them
 * after each scenario (same pattern as heartbeat/runtime.ts).
 *
 * Handles are keyed by `requestId` because they are the only non-serializable part of a
 * pending intent: everything else lives in `state.intents.pending[requestId]`.
 * `"raise"` is the `pendingIntentTimeoutMs` timer, `"delivery"` the
 * `openContextListenerTimeoutMs` one.
 */

type TimeoutHandle = ReturnType<typeof setTimeout>

export type PendingIntentTimeoutKind = "raise" | "delivery"

type PendingIntentTimeoutEntry = Partial<Record<PendingIntentTimeoutKind, TimeoutHandle>>

const pendingIntentTimeouts = new Map<string, PendingIntentTimeoutEntry>()

function forgetPendingIntentTimeout(requestId: string, kind: PendingIntentTimeoutKind): void {
  const entry = pendingIntentTimeouts.get(requestId)
  if (!entry) {
    return
  }
  delete entry[kind]
  if (Object.keys(entry).length === 0) {
    pendingIntentTimeouts.delete(requestId)
  }
}

export function registerPendingIntentTimeout(
  requestId: string,
  kind: PendingIntentTimeoutKind,
  handle: TimeoutHandle,
): void {
  const entry = pendingIntentTimeouts.get(requestId) ?? {}
  entry[kind] = handle
  pendingIntentTimeouts.set(requestId, entry)
}

/** Called when a tracked timeout fires naturally (already consumed by the event loop). */
export function releasePendingIntentTimeout(
  requestId: string,
  kind: PendingIntentTimeoutKind,
): void {
  forgetPendingIntentTimeout(requestId, kind)
}

export function clearPendingIntentTimeout(requestId: string, kind: PendingIntentTimeoutKind): void {
  const handle = pendingIntentTimeouts.get(requestId)?.[kind]
  if (handle) {
    clearTimeout(handle)
  }
  forgetPendingIntentTimeout(requestId, kind)
}

/** Clears both the raise and delivery timeouts for a request (settlement or teardown). */
export function clearPendingIntentTimeouts(requestId: string): void {
  const entry = pendingIntentTimeouts.get(requestId)
  if (!entry) {
    return
  }
  for (const handle of Object.values(entry)) {
    clearTimeout(handle)
  }
  pendingIntentTimeouts.delete(requestId)
}

/** @internal Returns active pending-intent timeout count (for tests and diagnostics). */
export function getActivePendingIntentTimeoutCount(): number {
  let count = 0
  for (const entry of pendingIntentTimeouts.values()) {
    count += Object.keys(entry).length
  }
  return count
}

/** @internal Clears all tracked pending-intent timeouts (Cucumber / tests only). */
export function clearAllPendingIntentTimeoutsForTesting(): void {
  for (const entry of pendingIntentTimeouts.values()) {
    for (const handle of Object.values(entry)) {
      clearTimeout(handle)
    }
  }
  pendingIntentTimeouts.clear()
}

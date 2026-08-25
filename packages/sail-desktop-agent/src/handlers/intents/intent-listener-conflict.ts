import type { IntentListener } from "../../state/types"

/**
 * FDC3 3.0 behavior: intent listeners for the same intent conflict when either listener
 * is unfiltered (handles all context types) or their declared context types overlap.
 *
 * Source: FINOS FDC3 next `api/ref/DesktopAgent.md` — addIntentListener /
 * addIntentListenerWithContext.
 */
export function intentListenerContextTypesOverlap(
  existingTypes: string[],
  incomingTypes: string[],
): boolean {
  const existingUnfiltered = existingTypes.length === 0
  const incomingUnfiltered = incomingTypes.length === 0

  if (existingUnfiltered || incomingUnfiltered) {
    return true
  }

  return existingTypes.some(type => incomingTypes.includes(type))
}

export function findConflictingIntentListener(
  listeners: IntentListener[],
  intentName: string,
  instanceId: string,
  incomingContextTypes: string[],
): IntentListener | undefined {
  return listeners.find(
    listener =>
      listener.active &&
      listener.intentName === intentName &&
      listener.instanceId === instanceId &&
      intentListenerContextTypesOverlap(listener.contextTypes, incomingContextTypes),
  )
}

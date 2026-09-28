import type { AppIdentifier } from "@finos/fdc3"
import type { IntentResolutionRequest } from "./types"

/**
 * Programmatically pick an intent handler without modal UI.
 *
 * Priority: explicit target → sole handler → running instance → directory order.
 */
export function selectIntentHandler(
  request: IntentResolutionRequest,
  target?: AppIdentifier | null,
): AppIdentifier | null {
  const { handlers } = request

  if (handlers.length === 0) {
    return null
  }

  if (target?.appId) {
    if (target.instanceId) {
      const match = handlers.find(
        handler => handler.appId === target.appId && handler.instanceId === target.instanceId,
      )
      return match ? { appId: match.appId, instanceId: match.instanceId } : null
    }

    const match = handlers.find(handler => handler.appId === target.appId)
    if (!match) {
      return null
    }
    return match.instanceId
      ? { appId: match.appId, instanceId: match.instanceId }
      : { appId: match.appId }
  }

  if (handlers.length === 1) {
    const handler = handlers[0]!
    return handler.instanceId
      ? { appId: handler.appId, instanceId: handler.instanceId }
      : { appId: handler.appId }
  }

  const runningHandlers = handlers.filter(handler => handler.isRunning)
  const chosen = runningHandlers.length > 0 ? runningHandlers[0]! : handlers[0]!

  return chosen.instanceId
    ? { appId: chosen.appId, instanceId: chosen.instanceId }
    : { appId: chosen.appId }
}

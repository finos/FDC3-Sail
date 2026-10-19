/**
 * Programmatic intent resolution for unattended hosts (CI / conformance).
 *
 * Priority: explicit target → sole handler → running instance → directory order.
 */

import type { AppIdentifier, Context } from "@finos/fdc3"
import type {
  IntentHandler,
  IntentResolutionRequest,
  IntentResolutionResponse,
  IntentResolver,
} from "./intent-resolver"

export type ProgrammaticIntentHandlerOption = {
  appId: string
  instanceId?: string
  isRunning?: boolean
}

export type ProgrammaticIntentResolutionRequest = {
  requestId: string
  intent: string
  context: Context
  handlers: ProgrammaticIntentHandlerOption[]
}

/**
 * Pick an intent handler without modal UI.
 */
export function selectIntentHandler(
  request: ProgrammaticIntentResolutionRequest,
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

export type ProgrammaticIntentResolverOptions = {
  debug?: boolean
  log?: (message: string, detail?: unknown) => void
}

/**
 * {@link IntentResolver} that selects handlers programmatically (no host UI).
 */
export function createProgrammaticIntentResolver(
  options: ProgrammaticIntentResolverOptions = {},
): IntentResolver {
  const log = options.log ?? ((message, detail) => console.log(message, detail ?? ""))

  return {
    resolve(request: IntentResolutionRequest): Promise<IntentResolutionResponse | null> {
      const programmaticRequest: ProgrammaticIntentResolutionRequest = {
        requestId: request.requestId,
        intent: request.intent,
        context: request.context,
        handlers: request.handlers.map(handler => ({
          appId: handler.app.appId,
          instanceId: handler.instanceId,
          isRunning: handler.isRunning,
        })),
      }

      const target = selectIntentHandler(programmaticRequest)

      if (options.debug) {
        log("[ProgrammaticIntentResolver] Intent resolution", {
          intent: request.intent,
          handlerCount: request.handlers.length,
          selectedHandler: target,
        })
      } else {
        log("[ProgrammaticIntentResolver] Intent resolution selected:", target)
      }

      if (!target) {
        return Promise.resolve(null)
      }

      const selectedHandler: IntentHandler | undefined = request.handlers.find(
        handler =>
          handler.app.appId === target.appId &&
          (target.instanceId === undefined || handler.instanceId === target.instanceId),
      )

      if (!selectedHandler) {
        return Promise.resolve(null)
      }

      return Promise.resolve({
        selectedHandler,
        target,
        intent: selectedHandler.intent.name,
      })
    },
  }
}

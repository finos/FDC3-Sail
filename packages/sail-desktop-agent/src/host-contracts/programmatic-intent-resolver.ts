import type {
  IntentHandler,
  IntentResolutionRequest,
  IntentResolutionResponse,
  IntentResolver,
} from "./intent-resolver"

export interface ProgrammaticIntentResolverOptions {
  /** Called once per resolution with the handler picked (or `null`). */
  log?: (message: string, detail?: unknown) => void
}

/**
 * An {@link IntentResolver} that picks a handler without any UI, for headless runs such as
 * conformance tests. FDC3 lets a Desktop Agent resolve intents by any method.
 *
 * Picks the sole handler, else the first running instance, else the first handler in
 * directory order. Returns `null` when there is no handler.
 */
export function createProgrammaticIntentResolver(
  options: ProgrammaticIntentResolverOptions = {},
): IntentResolver {
  return {
    resolve(request) {
      const selectedHandler = pickHandler(request.handlers)
      options.log?.("[ProgrammaticIntentResolver] Resolved intent", {
        intent: request.intent,
        handlerCount: request.handlers.length,
        selected: selectedHandler?.app.appId ?? null,
      })
      return Promise.resolve(selectedHandler ? toResponse(request, selectedHandler) : null)
    },
  }
}

function pickHandler(handlers: IntentHandler[]): IntentHandler | undefined {
  return handlers.find(handler => handler.isRunning) ?? handlers[0]
}

function toResponse(
  request: IntentResolutionRequest,
  selectedHandler: IntentHandler,
): IntentResolutionResponse {
  const target = selectedHandler.instanceId
    ? { appId: selectedHandler.app.appId, instanceId: selectedHandler.instanceId }
    : { appId: selectedHandler.app.appId }
  // raiseIntentForContext offers several intents; report the one this handler was offered for.
  const choice = request.choices?.find(candidate => candidate.handler === selectedHandler)
  return {
    selectedHandler,
    target,
    ...(choice ? { intent: choice.intent.name } : {}),
  }
}

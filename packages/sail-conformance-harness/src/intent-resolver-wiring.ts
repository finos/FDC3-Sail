import type { IntentResolver } from "@finos/sail-desktop-agent"
import { selectIntentHandler } from "./intent-resolution"
import type { IntentResolutionRequest as HarnessIntentResolutionRequest } from "./types"

/**
 * Build a host {@link IntentResolver} that picks handlers programmatically via
 * {@link selectIntentHandler} (no modal UI).
 */
export function createHarnessIntentResolver(debug = false): IntentResolver {
  return {
    resolve(request) {
      const harnessRequest: HarnessIntentResolutionRequest = {
        requestId: request.requestId,
        intent: request.intent,
        context: request.context,
        handlers: request.handlers.map(handler => ({
          ...handler.app,
          instanceId: handler.instanceId,
          isRunning: handler.isRunning,
        })),
      }

      const target = selectIntentHandler(harnessRequest)

      if (debug) {
        console.log("[ConformanceHarness] Intent resolution", {
          intent: request.intent,
          handlerCount: request.handlers.length,
          selectedHandler: target,
        })
      } else {
        console.log("[ConformanceHarness] Intent resolution selected:", target)
      }

      if (!target) {
        return Promise.resolve(null)
      }

      const selectedHandler = request.handlers.find(
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
      })
    },
  }
}

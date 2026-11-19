/**
 * Host-facing intent resolution for {@link SailFdc3SessionHandle}.
 * Framework-neutral: hosts subscribe via onRequest / select / cancel.
 */

import type { Context } from "@finos/fdc3-context-v2"
import type { AppIdentifier, AppMetadata, IntentMetadata } from "@finos/fdc3-standard-v2"

export interface IntentHandler {
  app: AppMetadata
  intent: IntentMetadata
  instanceId?: string
  isRunning: boolean
}

export interface IntentResolutionChoice {
  intent: IntentMetadata
  handler: IntentHandler
}

export interface IntentResolutionRequest {
  requestId: string
  intent: string
  context: Context
  handlers: IntentHandler[]
  choices?: IntentResolutionChoice[]
}

export interface IntentResolutionResponse {
  selectedHandler: IntentHandler
  target: AppIdentifier
  intent?: string
}

/** DA-facing: pick a handler (or null to cancel). */
export interface IntentResolver {
  resolve(request: IntentResolutionRequest): Promise<IntentResolutionResponse | null>
}

/** Host UI methods for rendering and completing resolver requests. */
export interface IntentResolverUIMethods {
  onRequest(listener: (request: IntentResolutionRequest) => void): () => void
  select(requestId: string, choice: IntentResolutionChoice | IntentHandler): void
  cancel(requestId: string): void
  getPendingRequests(): IntentResolutionRequest[]
}

export type HostIntentResolver = IntentResolver & IntentResolverUIMethods

export type HostIntentResolverOptions = {
  /** Milliseconds before an unanswered UI request is cancelled. Default 60000. */
  timeoutMs?: number
}

export function createHostIntentResolver(
  options?: HostIntentResolverOptions,
): HostIntentResolver {
  const timeoutMs = options?.timeoutMs ?? 60_000
  const listeners = new Set<(request: IntentResolutionRequest) => void>()
  const pendingRequests = new Map<string, IntentResolutionRequest>()
  const pendingResolvers = new Map<string, (response: IntentResolutionResponse | null) => void>()
  const pendingTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

  const clearPending = (requestId: string): void => {
    const timeout = pendingTimeouts.get(requestId)
    if (timeout) {
      clearTimeout(timeout)
    }
    pendingTimeouts.delete(requestId)
    pendingResolvers.delete(requestId)
    pendingRequests.delete(requestId)
  }

  const emitRequest = (request: IntentResolutionRequest): void => {
    for (const listener of listeners) {
      try {
        listener(request)
      } catch {
        // A broken UI subscriber must not prevent other subscribers.
      }
    }
  }

  return {
    async resolve(request) {
      const existingResolver = pendingResolvers.get(request.requestId)
      if (existingResolver) {
        existingResolver(null)
        clearPending(request.requestId)
      }

      pendingRequests.set(request.requestId, request)

      const responsePromise = new Promise<IntentResolutionResponse | null>(resolve => {
        pendingResolvers.set(request.requestId, resolve)
      })
      const timeout = setTimeout(() => {
        const resolve = pendingResolvers.get(request.requestId)
        if (!resolve) {
          return
        }
        clearPending(request.requestId)
        resolve(null)
      }, timeoutMs)
      pendingTimeouts.set(request.requestId, timeout)

      emitRequest(request)

      return responsePromise
    },

    onRequest(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    select(requestId, choice) {
      const resolve = pendingResolvers.get(requestId)
      if (!resolve) {
        return
      }

      clearPending(requestId)

      const selectedHandler = "handler" in choice ? choice.handler : choice
      const selectedIntent = "handler" in choice ? choice.intent.name : selectedHandler.intent.name

      resolve({
        selectedHandler,
        target: {
          appId: selectedHandler.app.appId,
          instanceId: selectedHandler.instanceId,
        },
        intent: selectedIntent,
      })
    },

    cancel(requestId) {
      const resolve = pendingResolvers.get(requestId)
      if (!resolve) {
        return
      }

      clearPending(requestId)
      resolve(null)
    },

    getPendingRequests() {
      return Array.from(pendingRequests.values())
    },
  }
}

export type ProgrammaticIntentResolverOptions = {
  debug?: boolean
  log?: (message: string, detail?: unknown) => void
}

/**
 * IntentResolver that selects handlers without UI (CI / auto-resolve).
 * Priority: sole handler → running instance → directory order.
 */
export function createProgrammaticIntentResolver(
  options: ProgrammaticIntentResolverOptions = {},
): IntentResolver {
  const log = options.log ?? ((message, detail) => console.log(message, detail ?? ""))

  return {
    resolve(request: IntentResolutionRequest): Promise<IntentResolutionResponse | null> {
      const { handlers } = request
      if (handlers.length === 0) {
        return Promise.resolve(null)
      }

      let chosen: IntentHandler
      if (handlers.length === 1) {
        chosen = handlers[0]!
      } else {
        const running = handlers.filter(h => h.isRunning)
        chosen = (running.length > 0 ? running[0] : handlers[0])!
      }

      if (options.debug) {
        log("[ProgrammaticIntentResolver] Intent resolution", {
          intent: request.intent,
          handlerCount: handlers.length,
          selected: chosen.app.appId,
        })
      } else {
        log("[ProgrammaticIntentResolver] Intent resolution selected:", {
          appId: chosen.app.appId,
          instanceId: chosen.instanceId,
        })
      }

      return Promise.resolve({
        selectedHandler: chosen,
        target: {
          appId: chosen.app.appId,
          instanceId: chosen.instanceId,
        },
        intent: chosen.intent.name,
      })
    },
  }
}

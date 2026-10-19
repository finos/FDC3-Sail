/**
 * Intent Resolver Interface
 *
 * Defines the contract for UI components that handle intent resolution
 * when multiple handlers are available for a raised intent.
 */

import type { AppIdentifier, AppMetadata, Context, IntentMetadata } from "@finos/fdc3"

/**
 * Information about a potential intent handler
 */
export interface IntentHandler {
  /** The app that can handle the intent */
  app: AppMetadata

  /** The intent this handler supports */
  intent: IntentMetadata

  /** Instance ID if this is a running app instance */
  instanceId?: string

  /** Whether this is an already-running instance */
  isRunning: boolean
}

/**
 * A concrete user choice for resolver UI.
 *
 * `raiseIntent` has a single intent with many possible handlers.
 * `raiseIntentForContext` can have many intent/app combinations, so UI
 * builders should render choices rather than assuming one intent per request.
 */
export interface IntentResolutionChoice {
  /** Intent that will be raised if this choice is selected. */
  intent: IntentMetadata

  /** App or running app instance that can handle the intent. */
  handler: IntentHandler
}

/**
 * Request for intent resolution
 */
export interface IntentResolutionRequest {
  /** Unique ID for this resolution request */
  requestId: string

  /** The intent being raised */
  intent: string

  /** The context being passed with the intent */
  context: Context

  /** Available handlers to choose from */
  handlers: IntentHandler[]

  /**
   * Available intent/app choices for UI.
   *
   * For `raiseIntent`, this mirrors `handlers` with a single intent.
   * For `raiseIntentForContext`, this may include multiple intents.
   */
  choices?: IntentResolutionChoice[]
}

/**
 * Response from intent resolution
 */
export interface IntentResolutionResponse {
  /** The selected handler */
  selectedHandler: IntentHandler

  /** The app identifier to target */
  target: AppIdentifier

  /** Intent selected by the user; mainly needed for raiseIntentForContext. */
  intent?: string
}

/**
 * Intent Resolver Interface
 *
 * Implementations provide UI for users to select between multiple
 * intent handlers. The platform will call resolve() when the
 * desktop agent needs user input to complete an intent resolution.
 *
 * @example
 * ```typescript
 * const intentResolver: IntentResolver = {
 *   resolve: async (request) => {
 *     // Show dialog with request.handlers
 *     const selected = await showIntentDialog(request)
 *     if (!selected) return null // User cancelled
 *     return {
 *       selectedHandler: selected,
 *       target: { appId: selected.app.appId, instanceId: selected.instanceId }
 *     }
 *   }
 * }
 * ```
 */
export interface IntentResolver {
  /**
   * Called when the user must choose between multiple intent handlers.
   *
   * @param request - The resolution request with available handlers
   * @returns The selected handler, or null if user cancelled
   */
  resolve(request: IntentResolutionRequest): Promise<IntentResolutionResponse | null>
}

/**
 * Sail host UI adapter handler metadata.
 *
 * This is not an FDC3 DACP or WCP wire message type. It is the browser-host
 * event shape used between Sail connector helpers and host-owned resolver UI.
 */
export type HostIntentResolverHandler = AppMetadata & {
  /** Whether this is a running instance with an active listener. */
  isRunning: boolean
}

/**
 * Sail host UI adapter choice metadata.
 *
 * Mirrors FDC3 resolver semantics while keeping the browser host UI independent
 * from injected resolver iframe protocol messages.
 */
export interface HostIntentResolverChoice {
  /** Intent metadata for this choice. */
  intent: IntentMetadata

  /** App or running app instance metadata for this choice. */
  handler: HostIntentResolverHandler
}

/**
 * Sail host UI adapter request payload.
 *
 * Not serialized as an official FDC3 DACP/WCP app-facing message.
 */
export interface HostIntentResolverPayload {
  /** Unique request ID for correlation. */
  requestId: string

  /** Primary intent for single-intent requests. Use `choices` for multi-intent requests. */
  intent: string

  /** Context being resolved. */
  context: unknown

  /** Available handlers for single-intent UIs. */
  handlers: HostIntentResolverHandler[]

  /** Available intent/app choices; may contain multiple intents for raiseIntentForContext. */
  choices?: HostIntentResolverChoice[]
}

/**
 * Sail host UI adapter response payload.
 *
 * Not serialized as an official FDC3 DACP/WCP app-facing message.
 */
export interface HostIntentResolverResponse {
  /** Request ID this is responding to. */
  requestId: string

  /** Selected handler, or null if the host UI cancelled. */
  selectedHandler: AppIdentifier | null

  /** Selected intent, needed when resolving raiseIntentForContext. */
  intent?: string
}

/**
 * Framework-neutral host UI methods for rendering and completing resolver requests.
 */
export interface IntentResolverUIMethods {
  /** Subscribe to resolver requests. Returns an unsubscribe function. */
  onRequest(listener: (request: IntentResolutionRequest) => void): () => void

  /** Complete a resolver request with the selected choice. */
  select(requestId: string, choice: IntentResolutionChoice | IntentHandler): void

  /** Cancel a resolver request, causing UserCancelledResolution for the caller. */
  cancel(requestId: string): void

  /** Snapshot currently pending resolver requests, useful for late UI subscribers. */
  getPendingRequests(): IntentResolutionRequest[]
}

/**
 * Host-side resolver object used by browser shells.
 *
 * It implements the Desktop Agent-facing {@link IntentResolver} contract and
 * exposes UI-facing methods that React, Vue, or vanilla JavaScript can consume.
 */
export type HostIntentResolver = IntentResolver & IntentResolverUIMethods

export interface HostIntentResolverOptions {
  /**
   * Milliseconds before an unanswered UI request is cancelled.
   *
   * Defaults to the browser WCP resolver timeout.
   */
  timeoutMs?: number
}

/**
 * Create a framework-neutral host resolver.
 */
export function createHostIntentResolver(options?: HostIntentResolverOptions): HostIntentResolver {
  const timeoutMs = options?.timeoutMs ?? 60000
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
        // A broken UI subscriber must not prevent other subscribers or leak state.
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

      // IntentHandler also has `intent`, so discriminate on `handler` for both fields.
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

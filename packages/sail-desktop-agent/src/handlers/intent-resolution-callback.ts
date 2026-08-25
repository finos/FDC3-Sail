import type { Context } from "@finos/fdc3"
import type {
  HostIntentResolverChoice,
  HostIntentResolverHandler,
  HostIntentResolverPayload,
  HostIntentResolverResponse,
} from "../host-contracts/intent-resolver"

/**
 * Sail-internal DACP handler callback types for host-owned intent resolver UI.
 *
 * These are not official FDC3 DACP wire message types. They describe the
 * callback payload the Desktop Agent core passes to host integration code when
 * it can resolve an app-facing DACP `raiseIntent*` request with host UI.
 */

/** Sail host resolver handler metadata used by internal resolver callbacks. */
export type IntentHandlerOption = HostIntentResolverHandler

/** Sail host resolver choice metadata used by internal resolver callbacks. */
export type IntentResolutionChoice = HostIntentResolverChoice

/**
 * Request payload for host-provided intent resolution.
 *
 * The host payload, narrowed: the Desktop Agent has already validated the context, so this
 * side of the boundary types it as {@link Context} rather than `unknown`.
 */
export type IntentResolutionRequest = Omit<HostIntentResolverPayload, "context"> & {
  context: Context
}

/** Response from host-provided intent resolution. */
export type IntentResolutionResponse = HostIntentResolverResponse

/**
 * Callback type for requesting host UI-based intent resolution.
 */
export type IntentResolutionCallback = (
  request: IntentResolutionRequest,
) => Promise<IntentResolutionResponse>

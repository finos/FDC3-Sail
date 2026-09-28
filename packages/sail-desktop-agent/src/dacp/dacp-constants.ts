/**
 * DACP Constants
 *
 * Standard timeouts for the DACP protocol.
 *
 * Error types for DACP responses come from the FDC3 schema: use the
 * `ResponsePayloadError` type (from `BrowserTypes` in `@finos/fdc3`) and
 * FDC3 error enums from `@finos/fdc3` so we stay aligned with the spec:
 * - OpenError (app launch), ChannelError (channels), ResolveError (intents),
 *   ResultError (intent result), BridgingError (e.g. MalformedMessage).
 */

// Standard DACP timeouts
export const DACP_TIMEOUTS = {
  DEFAULT: 10000, // 10 seconds
  APP_LAUNCH: 100000, // 100 seconds
  MINIMUM_APP_LAUNCH: 15000, // 15 seconds minimum
} as const

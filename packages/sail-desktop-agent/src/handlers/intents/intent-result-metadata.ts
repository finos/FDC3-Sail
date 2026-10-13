import type { BrowserTypes } from "@finos/fdc3"
import { buildContextMetadata, type WireContextMetadata } from "../../dacp/context-metadata"

/**
 * Builds the `intentResult` and `resultMetadata` of a `raiseIntentResultResponse`.
 *
 * `resultMetadata` is what `IntentResolution.getResultMetadata()` returns: `source` is the
 * handling app, plus `timestamp` and `traceId`. For a context result the handler's app-provided
 * `traceId`, `signature`, `antiReplay` and `custom` are forwarded; the agent generates a `traceId`
 * only when the handler sent none. This follows api/spec.md ("If the originating app provides a
 * traceId, the Desktop Agent MUST forward it"), which wins over the `IntentResolution` reference
 * text saying the agent's `traceId` takes precedence. Channel and void results carry only the
 * agent's fields.
 */
export function buildIntentResultWirePayload(
  intentResult: BrowserTypes.IntentResult | null,
  appMetadata: BrowserTypes.AppProvidableContextMetadata | undefined,
  target: { appId: string; instanceId: string },
  timestamp: string,
): { wireIntentResult: BrowserTypes.IntentResult; resultMetadata: WireContextMetadata } {
  const daMetadata = buildContextMetadata(target, undefined, timestamp)

  if (intentResult?.channel !== undefined) {
    return { wireIntentResult: { channel: intentResult.channel }, resultMetadata: daMetadata }
  }

  if (intentResult?.context !== undefined) {
    return {
      wireIntentResult: { context: intentResult.context },
      resultMetadata: buildContextMetadata(target, appMetadata, timestamp),
    }
  }

  return { wireIntentResult: {}, resultMetadata: daMetadata }
}

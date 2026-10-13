import type { BrowserTypes } from "@finos/fdc3"
import { buildContextMetadata, type WireContextMetadata } from "../../dacp/context-metadata"

/**
 * Builds the `intentResult` and `resultMetadata` of a `raiseIntentResultResponse`.
 *
 * `resultMetadata` is what `IntentResolution.getResultMetadata()` returns. Per the FDC3 3.0
 * `IntentResolution` reference it is always Desktop Agent generated (`source` is the handling
 * app, plus `timestamp` and `traceId`). For a context result, the handler's app-provided
 * `signature`, `antiReplay` and `custom` are merged in, with the agent's `traceId` taking
 * precedence. Channel and void results carry only the agent's fields.
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
    const { traceId: _appTraceId, ...forwarded } = appMetadata ?? {}
    return {
      wireIntentResult: { context: intentResult.context },
      resultMetadata: { ...forwarded, ...daMetadata },
    }
  }

  return { wireIntentResult: {}, resultMetadata: daMetadata }
}

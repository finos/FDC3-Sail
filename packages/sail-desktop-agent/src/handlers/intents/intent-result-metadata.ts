import type { BrowserTypes, Context, ContextMetadata } from "@finos/fdc3"
import type { RunningAppIdentifier } from "../../state/types"

/** DA-generated + optional app-provided fields for IntentResolution.getResultMetadata(). */
export type IntentResultContextMetadata = {
  source: RunningAppIdentifier
  timestamp: string
  traceId: string
  signature?: string
  custom?: Record<string, unknown>
}

type AppProvidedResultMetadata = {
  traceId?: string
  signature?: string
  custom?: Record<string, unknown>
}

/** App-provided fields on ContextWithMetadata for intent raise events. */
export type AppProvidedIntentContextMetadata = AppProvidedResultMetadata & {
  antiReplay?: string
}

type IntentEventBaseMetadata = ContextMetadata & { timestamp: string }

function isAppProvidedMetadata(value: unknown): value is AppProvidedResultMetadata {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    record.traceId !== undefined || record.signature !== undefined || record.custom !== undefined
  )
}

function isContextWithMetadataResult(
  intentResult: Record<string, unknown>,
): intentResult is { context: Context; metadata: AppProvidedResultMetadata } {
  return (
    "context" in intentResult &&
    typeof intentResult.context === "object" &&
    intentResult.context !== null &&
    "metadata" in intentResult &&
    isAppProvidedMetadata(intentResult.metadata)
  )
}

function buildDaResultMetadata(
  targetAppId: string,
  targetInstanceId: string,
  timestamp: string,
  daTraceId: string,
): IntentResultContextMetadata {
  return {
    source: { appId: targetAppId, instanceId: targetInstanceId },
    timestamp,
    traceId: daTraceId,
  }
}

/**
 * Normalize handler intentResult for raiseIntentResultResponse and build result metadata.
 *
 * ContextWithMetadata handlers return `{ context, metadata }` on the wire; getResult() receives
 * plain `{ context }` while getResultMetadata() receives merged DA + app fields.
 */
export function buildIntentResultWirePayload(
  intentResult: BrowserTypes.IntentResult | Record<string, unknown>,
  targetAppId: string,
  targetInstanceId: string,
  timestamp: string,
): {
  wireIntentResult: BrowserTypes.IntentResult
  resultMetadata: IntentResultContextMetadata
  isContextWithMetadata: boolean
} {
  const daTraceId = crypto.randomUUID()
  const baseMetadata = buildDaResultMetadata(targetAppId, targetInstanceId, timestamp, daTraceId)

  // oxlint-disable-next-line typescript/no-unnecessary-condition -- intentResult is null on the FDC3 wire even though the declared type is non-nullable; see the passing NoResultReturned Cucumber scenario at test/features/intents/intent-result.feature:61.
  if (typeof intentResult !== "object" || intentResult === null) {
    return { wireIntentResult: {}, resultMetadata: baseMetadata, isContextWithMetadata: false }
  }

  const record = intentResult as Record<string, unknown>

  if (isContextWithMetadataResult(record)) {
    const appMetadata = record.metadata
    return {
      wireIntentResult: { context: record.context },
      resultMetadata: {
        ...baseMetadata,
        ...(appMetadata.signature !== undefined ? { signature: appMetadata.signature } : {}),
        ...(appMetadata.custom !== undefined ? { custom: appMetadata.custom } : {}),
      },
      isContextWithMetadata: true,
    }
  }

  if ("channel" in record && record.channel !== undefined) {
    return {
      wireIntentResult: { channel: record.channel as BrowserTypes.Channel },
      resultMetadata: baseMetadata,
      isContextWithMetadata: false,
    }
  }

  if ("context" in record && record.context !== undefined) {
    return {
      wireIntentResult: { context: record.context as Context },
      resultMetadata: baseMetadata,
      isContextWithMetadata: false,
    }
  }

  return { wireIntentResult: {}, resultMetadata: baseMetadata, isContextWithMetadata: false }
}

/** Shallow copy so payload.resultMetadata and intentResult.metadata are distinct for transport clone. */
export function cloneIntentResultContextMetadata(
  metadata: IntentResultContextMetadata,
): IntentResultContextMetadata {
  return {
    ...metadata,
    source: { ...metadata.source },
    ...(metadata.custom !== undefined ? { custom: { ...metadata.custom } } : {}),
  }
}

/**
 * ContextWithMetadata wire intentResult stays `{ context }` for getResult(), while
 * getResultMetadata() reads merged fields from a non-enumerable metadata property.
 */
export function attachIntentResultClientMetadata(
  wireIntentResult: BrowserTypes.IntentResult,
  resultMetadata: IntentResultContextMetadata,
  isContextWithMetadata: boolean,
): BrowserTypes.IntentResult & { metadata?: IntentResultContextMetadata } {
  if (!isContextWithMetadata) {
    return { ...wireIntentResult, metadata: resultMetadata }
  }

  const intentResultWithClientMetadata = { ...wireIntentResult }
  Object.defineProperty(intentResultWithClientMetadata, "metadata", {
    value: resultMetadata,
    enumerable: false,
    writable: true,
    configurable: true,
  })
  return intentResultWithClientMetadata
}

function extractAppProvidedFieldsFromContextMetadata(
  metadata: unknown,
): AppProvidedIntentContextMetadata | undefined {
  if (typeof metadata !== "object" || metadata === null) {
    return undefined
  }
  const record = metadata as Record<string, unknown>
  const appFields: AppProvidedIntentContextMetadata = {}
  if (typeof record.traceId === "string") {
    appFields.traceId = record.traceId
  }
  if (typeof record.signature === "string") {
    appFields.signature = record.signature
  }
  if (typeof record.antiReplay === "string") {
    appFields.antiReplay = record.antiReplay
  }
  if (record.custom !== undefined && typeof record.custom === "object" && record.custom !== null) {
    appFields.custom = record.custom as Record<string, unknown>
  }
  return Object.keys(appFields).length > 0 ? appFields : undefined
}

/** Reads app metadata from a ContextWithMetadata raise payload. */
export function extractAppProvidedIntentContextMetadata(
  context: unknown,
): AppProvidedIntentContextMetadata | undefined {
  if (typeof context !== "object" || context === null || !("metadata" in context)) {
    return undefined
  }
  return extractAppProvidedFieldsFromContextMetadata(context.metadata)
}

/**
 * Merges app-provided ContextWithMetadata fields onto DA-built intentEvent metadata.
 * DA source/timestamp win; app traceId/signature/antiReplay/custom are forwarded when present.
 */
export function mergeIntentEventContextMetadata(
  baseMetadata: IntentEventBaseMetadata,
  appMetadata?: AppProvidedIntentContextMetadata,
): IntentEventBaseMetadata & AppProvidedIntentContextMetadata {
  if (!appMetadata) {
    return baseMetadata
  }
  return {
    ...baseMetadata,
    ...(appMetadata.traceId !== undefined ? { traceId: appMetadata.traceId } : {}),
    ...(appMetadata.signature !== undefined ? { signature: appMetadata.signature } : {}),
    ...(appMetadata.antiReplay !== undefined ? { antiReplay: appMetadata.antiReplay } : {}),
    ...(appMetadata.custom !== undefined ? { custom: appMetadata.custom } : {}),
  }
}

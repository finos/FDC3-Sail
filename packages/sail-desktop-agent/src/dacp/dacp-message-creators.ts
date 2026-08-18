/**
 * DACP Message Creators
 *
 * Factory functions for creating DACP protocol messages following the FDC3 specification.
 */

import type { AppIdentifier, BrowserTypes } from "@finos/fdc3"

type DACPResponseType = BrowserTypes.ResponseMessageType

/** Minimal request fields needed to build a correlated DACP response. */
export interface DACPRequestRef {
  type: string
  meta: {
    requestUuid: string
  }
}

/** FDC3 ContextMetadata plus the ISO `meta.timestamp` DACP events carry. */
type TimestampedContextMetadata = { source: AppIdentifier; timestamp: string }

/**
 * FDC3 ContextMetadata shape for DACP event payloads (source + ISO timestamp).
 * Mirrors `originatingApp` and event `meta.timestamp` for listener-side metadata.
 */
function buildContextMetadataFromOriginatingApp(
  originatingApp: AppIdentifier,
  timestamp: string,
): TimestampedContextMetadata {
  return {
    source: {
      appId: originatingApp.appId,
      ...(originatingApp.instanceId && { instanceId: originatingApp.instanceId }),
    },
    timestamp,
  }
}

function attachContextMetadataWhenPresent(
  payload: Record<string, unknown>,
  timestamp: string,
  appMetadata?: Record<string, unknown>,
): void {
  const originatingApp = payload.originatingApp as AppIdentifier | undefined
  if (!originatingApp?.appId) {
    return
  }
  const baseMetadata = buildContextMetadataFromOriginatingApp(originatingApp, timestamp)
  payload.metadata = appMetadata ? { ...baseMetadata, ...appMetadata } : baseMetadata
}

/**
 * FDC3 3.0 behavior: merge app-provided broadcast metadata (traceId, signature, custom)
 * onto DA-generated ContextMetadata on broadcast events.
 */
export function mergeBroadcastAppMetadata(
  baseMetadata: TimestampedContextMetadata,
  appMetadata?: Record<string, unknown>,
): TimestampedContextMetadata & Record<string, unknown> {
  if (!appMetadata) {
    return baseMetadata
  }

  return {
    ...baseMetadata,
    ...appMetadata,
  }
}

/**
 * Creates a DACP error response following the specification format.
 * Accepts any object with meta.requestUuid (typically a DACPMessage).
 * errorType must be a valid ResponsePayloadError from the FDC3 schema (use
 * OpenError, ResolveError, ChannelError, ResultError, BridgingError from @finos/fdc3).
 */
export function createDACPErrorResponse(
  originalRequest: DACPRequestRef,
  errorType: BrowserTypes.ResponsePayloadError,
  responseType: DACPResponseType,
  errorMessage?: string,
): BrowserTypes.AgentResponseMessage {
  const response = {
    type: responseType,
    payload: {
      error: errorType,
      ...(errorMessage && { message: errorMessage }),
    },
    meta: {
      responseUuid: crypto.randomUUID(),
      requestUuid: originalRequest.meta.requestUuid,
      timestamp: new Date().toISOString(),
    },
  }

  // BrowserTypes currently type meta.timestamp as Date, but wire schema expects ISO string.
  // TODO: Raise GitHub issue to align generated types with schema (timestamp as string).
  return response as unknown as BrowserTypes.AgentResponseMessage
}

/**
 * Creates a DACP success response following the specification format.
 * Accepts any object with meta.requestUuid (typically a DACPMessage).
 */
export function createDACPSuccessResponse(
  originalRequest: DACPRequestRef,
  responseType: DACPResponseType,
  payload: Record<string, unknown> = {},
): BrowserTypes.AgentResponseMessage {
  const response = {
    type: responseType,
    payload,
    meta: {
      responseUuid: crypto.randomUUID(),
      requestUuid: originalRequest.meta.requestUuid,
      timestamp: new Date().toISOString(),
    },
  }

  // BrowserTypes currently type meta.timestamp as Date, but wire schema expects ISO string.
  // TODO: Raise GitHub issue to align generated types with schema (timestamp as string).
  return response as unknown as BrowserTypes.AgentResponseMessage
}

/**
 * Creates a DACP event message.
 */
export function createDACPEvent(
  eventType: BrowserTypes.EventMessageType,
  payload: Record<string, unknown> = {},
  options?: { appMetadata?: Record<string, unknown> },
): BrowserTypes.AgentEventMessage {
  const timestamp = new Date().toISOString()
  const eventPayload = { ...payload }
  const appMetadata = options?.appMetadata
  attachContextMetadataWhenPresent(eventPayload, timestamp, appMetadata)

  const response = {
    type: eventType,
    payload: eventPayload,
    meta: {
      eventUuid: crypto.randomUUID(),
      timestamp,
    },
  }

  // BrowserTypes currently type meta.timestamp as Date, but wire schema expects ISO string.
  // TODO: Raise GitHub issue to align generated types with schema (timestamp as string).
  return response as unknown as BrowserTypes.AgentEventMessage
}

/**
 * Creates an intent event with requestUuid link for correlation.
 */
export function createIntentEvent(
  intent: string,
  context: unknown,
  requestUuid: string,
  originatingApp: AppIdentifier,
): BrowserTypes.IntentEvent {
  const timestamp = new Date().toISOString()
  const normalizedOriginatingApp = {
    appId: originatingApp.appId,
    ...(originatingApp.instanceId && { instanceId: originatingApp.instanceId }),
    ...(originatingApp.desktopAgent && { desktopAgent: originatingApp.desktopAgent }),
  }
  const response = {
    type: "intentEvent",
    payload: {
      intent,
      context,
      originatingApp: normalizedOriginatingApp,
      metadata: buildContextMetadataFromOriginatingApp(normalizedOriginatingApp, timestamp),
      raiseIntentRequestUuid: requestUuid,
    },
    meta: {
      eventUuid: crypto.randomUUID(),
      timestamp,
    },
  }

  // BrowserTypes currently type meta.timestamp as Date, but wire schema expects ISO string.
  // TODO: Raise GitHub issue to align generated types with schema (timestamp as string).
  return response as unknown as BrowserTypes.IntentEvent
}

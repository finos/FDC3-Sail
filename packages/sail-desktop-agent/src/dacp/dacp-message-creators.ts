/**
 * DACP Message Creators
 *
 * Factory functions for creating DACP protocol messages following the FDC3 specification.
 */

import type { AppIdentifier, BrowserTypes } from "@finos/fdc3"
import { buildContextMetadata, type WireContextMetadata } from "./context-metadata"

type DACPResponseType = BrowserTypes.ResponseMessageType

/** Minimal request fields needed to build a correlated DACP response. */
export interface DACPRequestRef {
  type: string
  meta: {
    requestUuid: string
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
 *
 * A payload that names an `originatingApp` also gets FDC3 3.0 `metadata`: `options.metadata` when
 * the caller built it (so every recipient sees the same `traceId`), otherwise a fresh one.
 */
export function createDACPEvent(
  eventType: BrowserTypes.EventMessageType,
  payload: Record<string, unknown> = {},
  options?: { metadata?: WireContextMetadata },
): BrowserTypes.AgentEventMessage {
  const timestamp = new Date().toISOString()
  const eventPayload = { ...payload }
  const originatingApp = payload.originatingApp as AppIdentifier | undefined
  if (options?.metadata) {
    eventPayload.metadata = options.metadata
  } else if (originatingApp?.appId) {
    eventPayload.metadata = buildContextMetadata(originatingApp, undefined, timestamp)
  }

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
  appMetadata?: BrowserTypes.AppProvidableContextMetadata,
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
      metadata: buildContextMetadata(normalizedOriginatingApp, appMetadata, timestamp),
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

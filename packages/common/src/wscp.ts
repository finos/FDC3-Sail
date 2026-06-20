/**
 * WebSocket Connection Protocol (WSCP) types and type guards.
 * Mirrors @finos/fdc3-schema WSCP schemas until published in fdc3-schema package.
 */

export type WscpConnectionStepMeta = {
  connectionAttemptUuid: string
  timestamp: string | Date
}

export type WscpDisconnectMeta = {
  timestamp: string | Date
}

export type Wscp1ConnectRequestPayload = {
  role: "application" | "desktopAgent"
  protocolVersion: "1.0"
  sessionId: string
  /** Required for initial connect (flow 1). Omit on reconnect (flow 2) when instanceUuid is supplied. */
  sharedSecret?: string
  appId?: string
  instanceId?: string
  instanceUuid?: string
}

export type Wscp1ConnectRequest = {
  type: "WSCP1ConnectRequest"
  payload: Wscp1ConnectRequestPayload
  meta: WscpConnectionStepMeta
}

export type Wscp2ConnectResponsePayload = {
  appId: string
  instanceId: string
  instanceUuid: string
  implementationMetadata: Record<string, unknown>
}

export type Wscp2ConnectResponse = {
  type: "WSCP2ConnectResponse"
  payload: Wscp2ConnectResponsePayload
  meta: WscpConnectionStepMeta
}

export type Wscp2ConnectFailedResponse = {
  type: "WSCP2ConnectFailedResponse"
  payload: { message: string }
  meta: WscpConnectionStepMeta
}

export type Wscp3Goodbye = {
  type: "WSCP3Goodbye"
  meta: WscpDisconnectMeta
}

export type WscpMessage =
  | Wscp1ConnectRequest
  | Wscp2ConnectResponse
  | Wscp2ConnectFailedResponse
  | Wscp3Goodbye

export const WSCP_INBOUND_PATH = "/fdc3/ws"

/** Builds the deployment-wide inbound WebSocket URL from the current page origin. */
export function getInboundWebSocketUrl(pageOrigin?: string): string {
  const origin =
    pageOrigin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:8090")
  if (origin.startsWith("https://")) {
    return "wss://" + origin.substring(8) + WSCP_INBOUND_PATH
  }
  if (origin.startsWith("http://")) {
    return "ws://" + origin.substring(7) + WSCP_INBOUND_PATH
  }
  return origin + WSCP_INBOUND_PATH
}

/** Property injected into native app details for UI display only (never in published directory). */
export const FDC3_SHARED_SECRET_PROPERTY = "sharedSecret"

export function isWscp1ConnectRequest(
  msg: unknown,
): msg is Wscp1ConnectRequest {
  const payload = (msg as Wscp1ConnectRequest)?.payload
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as Wscp1ConnectRequest).type === "WSCP1ConnectRequest" &&
    typeof payload?.sessionId === "string" &&
    (typeof payload?.sharedSecret === "string" ||
      typeof payload?.instanceUuid === "string")
  )
}

export function isWscp3Goodbye(msg: unknown): msg is Wscp3Goodbye {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as Wscp3Goodbye).type === "WSCP3Goodbye"
  )
}

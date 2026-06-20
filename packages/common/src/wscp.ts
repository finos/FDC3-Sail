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

export type WscpApplicationConnectPayload = {
  protocolVersion: "1.0"
  /** Present when the application is the TCP initiator (Flow 1). */
  sharedSecret?: string
}

export type WscpApplicationConnect = {
  type: "WSCPApplicationConnect"
  payload: WscpApplicationConnectPayload
  meta: WscpConnectionStepMeta
}

export type WscpDesktopAgentConnectPayload = {
  protocolVersion: "1.0"
  /** Present when the Desktop Agent is the TCP initiator (Flow 2). */
  sharedSecret?: string
  implementationMetadata: Record<string, unknown>
}

export type WscpDesktopAgentConnect = {
  type: "WSCPDesktopAgentConnect"
  payload: WscpDesktopAgentConnectPayload
  meta: WscpConnectionStepMeta
}

export type WscpConnectFailed = {
  type: "WSCPConnectFailed"
  payload: { message: string }
  meta: WscpConnectionStepMeta
}

export type WscpGoodbye = {
  type: "WSCPGoodbye"
  meta: WscpDisconnectMeta
}

export type WscpMessage =
  | WscpApplicationConnect
  | WscpDesktopAgentConnect
  | WscpConnectFailed
  | WscpGoodbye

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

export function isWscpApplicationConnect(
  msg: unknown,
): msg is WscpApplicationConnect {
  const payload = (msg as WscpApplicationConnect)?.payload
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as WscpApplicationConnect).type === "WSCPApplicationConnect" &&
    payload?.protocolVersion === "1.0"
  )
}

export function isWscpGoodbye(msg: unknown): msg is WscpGoodbye {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as WscpGoodbye).type === "WSCPGoodbye"
  )
}

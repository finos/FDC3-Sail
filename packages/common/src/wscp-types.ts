/**
 * Lightweight WSCP message shapes (Flow 1).
 * Mirror https://fdc3.finos.org/docs/next/api/specs/webSocketConnectionProtocol
 * until @finos/fdc3-schema publishes these types.
 */

export type WscpConnectionStepMeta = {
  connectionAttemptUuid: string
  timestamp: string
}

export type WscpApplicationConnect = {
  type: "WSCPApplicationConnect"
  payload: {
    protocolVersion: "1.0"
    sharedSecret?: string
  }
  meta: WscpConnectionStepMeta
}

export type WscpDesktopAgentConnect = {
  type: "WSCPDesktopAgentConnect"
  payload: {
    protocolVersion: "1.0"
    implementationMetadata: {
      fdc3Version: string
      provider: string
      providerVersion: string
      optionalFeatures?: Record<string, boolean>
      appMetadata: {
        appId: string
        instanceId: string
        title?: string
      }
    }
  }
  meta: WscpConnectionStepMeta
}

export type WscpConnectFailed = {
  type: "WSCPConnectFailed"
  payload: {
    message: string
  }
  meta: WscpConnectionStepMeta
}

export type WscpGoodbye = {
  type: "WSCPGoodbye"
  meta: {
    timestamp: string
  }
}

export function isWscpApplicationConnect(
  value: unknown,
): value is WscpApplicationConnect {
  return (
    value != null &&
    typeof value === "object" &&
    (value as { type?: string }).type === "WSCPApplicationConnect"
  )
}

export function isWscpGoodbye(value: unknown): value is WscpGoodbye {
  return (
    value != null &&
    typeof value === "object" &&
    (value as { type?: string }).type === "WSCPGoodbye"
  )
}

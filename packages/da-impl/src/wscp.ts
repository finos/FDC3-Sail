export type Wscp1ConnectRequest = {
  type: "WSCP1ConnectRequest"
  payload: {
    role: "application" | "desktopAgent"
    protocolVersion: string
    sessionId: string
    sharedSecret?: string
    appId?: string
    instanceId?: string
    instanceUuid?: string
  }
  meta: {
    connectionAttemptUuid: string
    timestamp: Date | string
  }
}

import { ImplementationMetadata } from "@finos/fdc3-standard"

export type Wscp2ConnectResponse = {
  type: "WSCP2ConnectResponse"
  payload: {
    appId: string
    instanceId: string
    instanceUuid: string
    implementationMetadata: ImplementationMetadata
  }
  meta: {
    connectionAttemptUuid: string
    timestamp: Date | string
  }
}

export type Wscp2ConnectFailedResponse = {
  type: "WSCP2ConnectFailedResponse"
  payload: { message: string }
  meta: {
    connectionAttemptUuid: string
    timestamp: Date | string
  }
}

export function isWscp1ConnectRequest(
  msg: unknown,
): msg is Wscp1ConnectRequest {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as Wscp1ConnectRequest).type === "WSCP1ConnectRequest"
  )
}

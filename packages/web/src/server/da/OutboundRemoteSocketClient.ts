import WebSocket from "ws"
import { v4 as uuid } from "uuid"
import { SailFDC3ServerInstance } from "./SailFDC3ServerInstance"
import { WebSocketConnection } from "./connection/WebSocketConnection"
import { AppHosting } from "@finos/fdc3-sail-common"
import { State } from "@finos/fdc3-sail-da-impl"
import { createLogger } from "../logger"

const log = createLogger("OutboundRemote")

export type OutboundConnectParams = {
  userSessionId: string
  webSocketUrl: string
  /** Required for flow 3 (initial connect). Omit for flow 4 when instanceUuid is supplied. */
  sharedSecret?: string
  appId?: string
  instanceId?: string
  instanceUuid?: string
}

/**
 * DA-initiated WebSocket client (flows 3–4).
 * Sail opens TCP to a native app WS server and performs WSCP handshake.
 */
export class OutboundRemoteSocketClient {
  async connect(
    fdc3Server: SailFDC3ServerInstance,
    params: OutboundConnectParams,
  ): Promise<string> {
    const instanceId = params.instanceId ?? "sail-outbound-" + uuid()
    const instanceUuid = params.instanceUuid ?? uuid()
    const connectionAttemptUuid = uuid()

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(params.webSocketUrl)
      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error("WSCP handshake timeout"))
      }, 15000)

      ws.on("open", () => {
        const payload: Record<string, string> = {
          role: "desktopAgent",
          protocolVersion: "1.0",
          sessionId: params.userSessionId,
          instanceId,
          instanceUuid,
        }
        if (params.appId) {
          payload.appId = params.appId
        }
        // Flow 3: sharedSecret required. Flow 4: omit when reconnecting with instanceUuid.
        if (params.sharedSecret) {
          payload.sharedSecret = params.sharedSecret
        }
        ws.send(
          JSON.stringify({
            type: "WSCP1ConnectRequest",
            meta: {
              connectionAttemptUuid,
              timestamp: new Date().toISOString(),
            },
            payload,
          }),
        )
      })

      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString())
          if (msg.type === "WSCP2ConnectFailedResponse") {
            clearTimeout(timeout)
            ws.close()
            reject(new Error(msg.payload?.message ?? "Connection failed"))
            return
          }
          if (msg.type === "WSCP2ConnectResponse") {
            clearTimeout(timeout)
            const connection = new WebSocketConnection(ws)
            fdc3Server.setInstanceDetails(instanceId, {
              instanceId,
              state: State.Connected,
              appId: msg.payload.appId ?? params.appId ?? "remote-native",
              connection,
              hosting: AppHosting.Remote,
              channel: null,
              instanceTitle: `Remote (${params.webSocketUrl})`,
              channelConnections: [],
            })
            log.info(
              { instanceId, appId: msg.payload.appId },
              "Outbound WSCP connected",
            )
            resolve(instanceId)
          }
        } catch (e) {
          clearTimeout(timeout)
          reject(e)
        }
      })

      ws.on("error", (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })
  }
}

import type { Application } from "express"
import type { Server } from "http"
import { WebSocketServer, WebSocket } from "ws"
import crypto from "node:crypto"

const WSCP_PATH = "/fdc3/ws"

let sharedSecret = crypto.randomBytes(16).toString("hex")
let connectionStatus = "waiting"
const knownInstances = new Map<string, string>()

export function getSharedSecret(): string {
  return sharedSecret
}

export function getConnectionStatus(): string {
  return connectionStatus
}

export default async function backend(
  app: Application,
  server: Server,
  opts: { port: number; appRoot: string },
): Promise<void> {
  const webSocketUrl = `ws://localhost:${opts.port}${WSCP_PATH}`

  app.get("/api/wscp-config", (_req, res) => {
    res.json({
      webSocketUrl,
      sharedSecret,
      status: connectionStatus,
    })
  })

  const wss = new WebSocketServer({ noServer: true })

  server.on("upgrade", (request, socket, head) => {
    const pathname = (request.url || "").split("?")[0]
    if (pathname === WSCP_PATH) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request)
      })
    }
  })

  wss.on("connection", (ws: WebSocket) => {
    let handshakeComplete = false

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === "WSCP1ConnectRequest" && !handshakeComplete) {
          handleWscp1(ws, msg)
          handshakeComplete = true
        }
      } catch {
        ws.close()
      }
    })

    ws.on("close", () => {
      connectionStatus = "disconnected"
    })
  })
}

function handleWscp1(ws: WebSocket, msg: Record<string, unknown>): void {
  const payload = msg.payload as Record<string, string> | undefined
  if (!payload) {
    ws.close()
    return
  }

  const instanceUuid = payload.instanceUuid

  // Flow 4: reconnect with sessionId + instanceUuid (no sharedSecret)
  if (instanceUuid && knownInstances.has(instanceUuid)) {
    const instanceId = knownInstances.get(instanceUuid)!
    connectionStatus = "connected"
    ws.send(JSON.stringify(buildSuccessResponse(msg, instanceId, instanceUuid)))
    return
  }

  // Flow 3: initial connect requires sharedSecret
  if (!payload.sharedSecret || payload.sharedSecret !== sharedSecret) {
    ws.send(
      JSON.stringify({
        type: "WSCP2ConnectFailedResponse",
        meta: msg.meta,
        payload: { message: "Invalid shared secret" },
      }),
    )
    ws.close()
    return
  }

  const instanceId = payload.instanceId ?? "wscp-listener-instance"
  const newInstanceUuid = instanceUuid ?? crypto.randomUUID()
  knownInstances.set(newInstanceUuid, instanceId)

  connectionStatus = "connected"
  ws.send(
    JSON.stringify(buildSuccessResponse(msg, instanceId, newInstanceUuid)),
  )
}

function buildSuccessResponse(
  msg: Record<string, unknown>,
  instanceId: string,
  instanceUuid: string,
) {
  return {
    type: "WSCP2ConnectResponse",
    meta: msg.meta,
    payload: {
      appId: "wscp-listener",
      instanceId,
      instanceUuid,
      implementationMetadata: {
        provider: "wscp-listener",
        providerVersion: "1.0.0",
        fdc3Version: "2.2",
        optionalFeatures: {
          OriginatingAppMetadata: true,
          UserChannelMembershipAPIs: true,
          DesktopAgentBridging: false,
        },
        appMetadata: { appId: "wscp-listener" },
      },
    },
  }
}

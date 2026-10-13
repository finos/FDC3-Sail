import { WebSocketServer, WebSocket } from "ws"
import { IncomingMessage } from "http"
import { SailFDC3ServerFactory } from "./SailFDC3ServerFactory"
import { WebSocketConnection } from "./connection/WebSocketConnection"
import { createConnectionContext } from "./sail-handlers"
import { handleRemoteAppMessage } from "./sail-handlers/handleRemoteAppMessage"
import { handleRemoteAppDisconnect } from "./sail-handlers/handleRemoteAppDisconnect"
import { createLogger } from "../logger"

const log = createLogger("RemoteSocket")

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * WSCP Flow 1 acceptor for native applications.
 *
 * Native apps connect to the stable endpoint:
 *   /fdc3/ws
 *
 * Identity is established via WSCPApplicationConnect.sharedSecret, which the
 * browser DA mints and syncs through SailClientStateArgs.
 */
export class RemoteSocketService {
  private readonly factory: SailFDC3ServerFactory
  private readonly httpServer: any
  private readonly wss: WebSocketServer

  constructor(httpServer: any, factory: SailFDC3ServerFactory) {
    this.httpServer = httpServer
    this.factory = factory

    this.wss = new WebSocketServer({
      noServer: true,
    })

    this.setupUpgradeHandler()
    this.setupConnectionHandler()

    log.info("RemoteSocketService initialized (WSCP /fdc3/ws)")
  }

  private setupUpgradeHandler(): void {
    this.httpServer.on(
      "upgrade",
      (request: IncomingMessage, socket: any, head: Buffer) => {
        const pathname = (request.url || "").split("?")[0]

        if (pathname === "/fdc3/ws") {
          this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit("connection", ws, request)
          })
          return
        }

        // Legacy path-based remote URLs are no longer accepted
        if (pathname.startsWith("/remote/")) {
          log.error(
            { pathname },
            "Remote connection rejected - use /fdc3/ws with WSCP sharedSecret",
          )
          socket.destroy()
        }
      },
    )
  }

  private setupConnectionHandler(): void {
    this.wss.on("connection", (ws: WebSocket, _request: IncomingMessage) => {
      log.info("Remote WebSocket client connected to /fdc3/ws")

      const connection = new WebSocketConnection(ws as any)
      const ctx = createConnectionContext()

      ws.on("message", (data: Buffer | string) => {
        try {
          const message = JSON.parse(data.toString())
          handleRemoteAppMessage(ctx, this.factory, connection, ws, message)
        } catch (e) {
          log.error({ error: e }, "Remote: Failed to parse message as JSON")
        }
      })

      ws.on("close", () => {
        handleRemoteAppDisconnect(ctx, connection).catch((e) => {
          log.error({ error: e }, "Error handling remote disconnect")
        })
      })

      ws.on("error", (error) => {
        log.error({ error }, "Remote WebSocket error")
      })
    })
  }

  /**
   * Shutdown the service and close all connections.
   */
  shutdown(): void {
    this.wss.close()
    log.info("RemoteSocketService shutdown")
  }
}

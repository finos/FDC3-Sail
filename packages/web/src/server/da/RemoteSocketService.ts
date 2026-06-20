import { WebSocketServer, WebSocket } from "ws"
import { IncomingMessage } from "http"
import { v4 as uuid } from "uuid"
import { SailFDC3ServerFactory } from "./SailFDC3ServerFactory"
import { WebSocketConnection } from "./connection/WebSocketConnection"
import { createConnectionContext } from "./sail-handlers"
import {
  AppHosting,
  isWscpApplicationConnect,
  isWscpGoodbye,
  WSCP_INBOUND_PATH,
} from "@finos/fdc3-sail-common"
import { DirectoryApp, OpenHandler, State } from "@finos/fdc3-sail-da-impl"
import { handleRemoteAppMessage } from "./sail-handlers/handleRemoteAppMessage"
import { handleRemoteAppDisconnect } from "./sail-handlers/handleRemoteAppDisconnect"
import { createLogger } from "../logger"

const log = createLogger("RemoteSocket")

/* eslint-disable  @typescript-eslint/no-explicit-any */

const openHandler = new OpenHandler(10000, () => {})

/**
 * Manages the inbound WSCP WebSocket endpoint for remote/native applications.
 *
 * Flow 1 (application-initiated): a native app opens a WebSocket to `/fdc3/ws`,
 * sends `WSCPApplicationConnect` with `sharedSecret`, and receives
 * `WSCPDesktopAgentConnect` before DACP traffic begins.
 *
 * @see https://fdc3.finos.org/docs/api/specs/webSocketConnectionProtocol
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

    log.info({ path: WSCP_INBOUND_PATH }, "RemoteSocketService initialized")
  }

  private setupUpgradeHandler(): void {
    this.httpServer.on(
      "upgrade",
      (request: IncomingMessage, socket: any, head: Buffer) => {
        const pathname = request.url?.split("?")[0] ?? ""

        if (pathname === WSCP_INBOUND_PATH) {
          this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit("connection", ws, request)
          })
          return
        }
      },
    )
  }

  private setupConnectionHandler(): void {
    this.wss.on("connection", (ws: WebSocket) => {
      log.info("Remote WebSocket client connected, awaiting WSCP handshake")

      const connection = new WebSocketConnection(ws as any)
      const ctx = createConnectionContext()
      let handshakeComplete = false
      let nativeApp: DirectoryApp | undefined

      const onMessage = async (data: Buffer | string) => {
        let message: any
        try {
          message = JSON.parse(data.toString())
        } catch (e) {
          log.error({ error: e }, "Remote: Failed to parse message as JSON")
          return
        }

        if (!handshakeComplete) {
          await this.handleHandshake(ws, ctx, connection, message, (app) => {
            nativeApp = app
            handshakeComplete = true
          })
          return
        }

        if (isWscpGoodbye(message)) {
          log.info(
            { appInstanceId: ctx.appInstanceId },
            "Remote app sent WSCPGoodbye",
          )
          await handleRemoteAppDisconnect(ctx)
          ws.close()
          return
        }

        if (!nativeApp) {
          log.error("Remote message received without native app context")
          return
        }

        handleRemoteAppMessage(ctx, nativeApp, connection, message)
      }

      ws.on("message", (data) => {
        const payload =
          typeof data === "string"
            ? data
            : Buffer.isBuffer(data)
              ? data
              : Buffer.from(data as ArrayBuffer)
        void onMessage(payload)
      })

      ws.on("close", () => {
        if (handshakeComplete) {
          void handleRemoteAppDisconnect(ctx)
        } else {
          log.debug("Remote WebSocket closed before WSCP handshake completed")
        }
      })

      ws.on("error", (error) => {
        log.error({ error }, "Remote WebSocket error")
      })
    })
  }

  private async handleHandshake(
    ws: WebSocket,
    ctx: ReturnType<typeof createConnectionContext>,
    connection: WebSocketConnection,
    message: unknown,
    onComplete: (nativeApp: DirectoryApp) => void,
  ): Promise<void> {
    if (!isWscpApplicationConnect(message)) {
      this.sendConnectFailed(
        ws,
        "Expected WSCPApplicationConnect as first message",
      )
      return
    }

    const { payload, meta } = message
    const connectionAttemptUuid = meta.connectionAttemptUuid

    if (!payload.sharedSecret) {
      this.sendConnectFailed(
        ws,
        "Missing sharedSecret in WSCPApplicationConnect",
        connectionAttemptUuid,
      )
      return
    }

    const pairing = this.factory.resolveNativeAppPairing(payload.sharedSecret)
    if (!pairing) {
      this.sendConnectFailed(
        ws,
        "Invalid or unknown sharedSecret",
        connectionAttemptUuid,
      )
      return
    }

    const { sessionId, appId, instanceId, fdc3Server, nativeApp } = pairing
    ctx.userSessionId = sessionId
    ctx.fdc3ServerInstance = fdc3Server
    ctx.appInstanceId = instanceId

    const existing = fdc3Server.getInstanceDetails(instanceId)

    if (existing) {
      log.info(
        { appId, instanceId },
        "Reassigning existing remote app instance",
      )

      const priorConnection = existing.connection
      if (priorConnection && priorConnection !== connection) {
        priorConnection.shutdown()
      }

      fdc3Server.setInstanceDetails(instanceId, {
        ...existing,
        connection,
      })
    } else {
      log.info({ appId, instanceId }, "Registering new remote app instance")

      fdc3Server.setInstanceDetails(instanceId, {
        instanceId,
        state: State.Pending,
        appId,
        connection,
        hosting: AppHosting.Remote,
        channel: null,
        instanceTitle: `${nativeApp.title || appId} (Remote)`,
        channelConnections: [],
      })
    }

    const implementationMetadata = openHandler.getImplementationMetadata(
      fdc3Server,
      { appId, instanceId },
    )

    ws.send(
      JSON.stringify({
        type: "WSCPDesktopAgentConnect",
        payload: {
          protocolVersion: "1.0",
          implementationMetadata,
        },
        meta: {
          connectionAttemptUuid,
          timestamp: new Date().toISOString(),
        },
      }),
    )

    await fdc3Server.setAppState(instanceId, State.Connected)
    onComplete(nativeApp)
    log.info({ appId, instanceId, sessionId }, "WSCP handshake completed")
  }

  private sendConnectFailed(
    ws: WebSocket,
    message: string,
    connectionAttemptUuid?: string,
  ): void {
    log.warn({ message }, "WSCP handshake failed")
    ws.send(
      JSON.stringify({
        type: "WSCPConnectFailed",
        payload: { message },
        meta: {
          connectionAttemptUuid: connectionAttemptUuid ?? uuid(),
          timestamp: new Date().toISOString(),
        },
      }),
    )
    ws.close()
  }

  /**
   * Retained for compatibility with directory refresh callbacks.
   * Inbound connections are accepted on the fixed `/fdc3/ws` path; pairing is
   * validated via sharedSecret during the handshake.
   */
  refreshAvailableRemoteSockets(
    userSessionId: string,
    nativeApps: DirectoryApp[],
  ): void {
    void userSessionId
    void nativeApps
    log.debug("RemoteSocketService refresh (no-op for inbound WSCP endpoint)")
  }

  getActivePaths(): string[] {
    return [WSCP_INBOUND_PATH]
  }

  shutdown(): void {
    this.wss.close()
    log.info("RemoteSocketService shutdown")
  }
}

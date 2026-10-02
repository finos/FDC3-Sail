import { ConnectionContext } from "./types"
import {
  AppHosting,
  isWscpApplicationConnect,
  isWscpGoodbye,
  WscpApplicationConnect,
  WscpConnectFailed,
  WscpDesktopAgentConnect,
} from "@finos/fdc3-sail-common"
import { Fdc3ApiVersion, State } from "@finos/fdc3-sail-da-impl"
import { v4 as uuid } from "uuid"
import { WebSocketConnection } from "../connection"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { createLogger } from "../../logger"
import { WebSocket } from "ws"

const log = createLogger("RemoteAppMessage")

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Route WSCP handshake and subsequent DACP messages for a remote native app.
 */
export function handleRemoteAppMessage(
  ctx: ConnectionContext,
  factory: SailFDC3ServerFactory,
  connection: WebSocketConnection,
  ws: WebSocket,
  data: any,
): void {
  const messageType = data?.type

  if (!messageType) {
    log.error({ data }, "Message missing type field")
    return
  }

  if (!messageType.startsWith("heartbeat")) {
    log.debug(
      { messageType, data: JSON.stringify(data).substring(0, 200) },
      "Remote message received",
    )
  }

  if (isWscpApplicationConnect(data)) {
    handleWscpApplicationConnect(ctx, factory, connection, ws, data)
    return
  }

  if (isWscpGoodbye(data)) {
    log.info(
      { appInstanceId: ctx.appInstanceId },
      "WSCPGoodbye received — closing socket, retaining pairing",
    )
    // Spec: acceptor SHOULD close after goodbye but retain sharedSecret mapping
    ws.close()
    return
  }

  if (!ctx.appInstanceId || !ctx.fdc3ServerInstance) {
    log.error(
      { messageType },
      "Received message before WSCP handshake completed",
    )
    return
  }

  try {
    ctx.fdc3ServerInstance.receive(data, ctx.appInstanceId)
  } catch (e) {
    log.error({ error: e }, "Error processing DACP message")
  }
}

function handleWscpApplicationConnect(
  ctx: ConnectionContext,
  factory: SailFDC3ServerFactory,
  connection: WebSocketConnection,
  ws: WebSocket,
  msg: WscpApplicationConnect,
): void {
  const connectionAttemptUuid = msg.meta?.connectionAttemptUuid
  const sharedSecret = msg.payload?.sharedSecret

  if (!connectionAttemptUuid) {
    log.error("WSCPApplicationConnect missing connectionAttemptUuid")
    ws.close()
    return
  }

  if (!sharedSecret) {
    sendConnectFailed(
      connection,
      connectionAttemptUuid,
      "sharedSecret is required when the application is the TCP initiator",
    )
    ws.close()
    return
  }

  const found = factory.findSessionBySharedSecret(sharedSecret)
  if (!found) {
    sendConnectFailed(
      connection,
      connectionAttemptUuid,
      "Invalid or unknown sharedSecret",
    )
    ws.close()
    return
  }

  const { userSessionId, session } = found
  const pairing = session.getWscpPairingBySecret(sharedSecret)!
  const directoryApps = session.directory.retrieveAppsById(pairing.appId)
  const nativeApp = directoryApps[0]

  ctx.userSessionId = userSessionId
  ctx.fdc3ServerInstance = session

  let instanceId = pairing.instanceId
  if (instanceId) {
    const existing = session.getInstanceDetails(instanceId)
    if (existing) {
      log.info(
        { appId: pairing.appId, instanceId },
        "WSCP reconnect — rebinding existing instance",
      )
      // Supersede any prior WebSocket for this instance
      existing.connection?.shutdown()
      session.setInstanceDetails(instanceId, {
        ...existing,
        connection,
        state: State.Pending,
      })
    } else {
      log.info(
        { appId: pairing.appId },
        "Stored instanceId not found — creating new instance",
      )
      instanceId = registerRemoteInstance(
        session,
        connection,
        pairing.appId,
        nativeApp?.title,
      )
      session.assignWscpInstanceId(sharedSecret, instanceId)
    }
  } else {
    instanceId = registerRemoteInstance(
      session,
      connection,
      pairing.appId,
      nativeApp?.title,
    )
    session.assignWscpInstanceId(sharedSecret, instanceId)
  }

  ctx.appInstanceId = instanceId

  const response: WscpDesktopAgentConnect = {
    type: "WSCPDesktopAgentConnect",
    payload: {
      protocolVersion: "1.0",
      implementationMetadata: {
        fdc3Version: session.fdc3Version(),
        provider: session.provider(),
        providerVersion: session.providerVersion(),
        optionalFeatures: {
          OriginatingAppMetadata: true,
          UserChannelMembershipAPIs: true,
        },
        appMetadata: {
          appId: pairing.appId,
          instanceId,
          title: nativeApp?.title,
        },
      },
    },
    meta: {
      connectionAttemptUuid,
      timestamp: new Date().toISOString(),
    },
  }

  // Send raw WSCP JSON (WebSocketConnection ignores the event name)
  connection.emit("wscp", response)
  log.info(
    { appId: pairing.appId, instanceId },
    "WSCPDesktopAgentConnect sent",
  )
}

function registerRemoteInstance(
  session: NonNullable<ConnectionContext["fdc3ServerInstance"]>,
  connection: WebSocketConnection,
  appId: string,
  title: string | undefined,
): string {
  const newInstanceId = "sail-remote-" + uuid()
  const daVersion = session.fdc3Version()
  const fdc3Version: Fdc3ApiVersion = daVersion.startsWith("3") ? "3.0" : "2.2"
  session.setInstanceDetails(newInstanceId, {
    instanceId: newInstanceId,
    state: State.Pending,
    appId,
    fdc3Version,
    connection,
    hosting: AppHosting.Remote,
    channel: null,
    instanceTitle: `${title || appId} (Remote)`,
    channelConnections: [],
  })
  return newInstanceId
}

function sendConnectFailed(
  connection: WebSocketConnection,
  connectionAttemptUuid: string,
  message: string,
): void {
  const failed: WscpConnectFailed = {
    type: "WSCPConnectFailed",
    payload: { message },
    meta: {
      connectionAttemptUuid,
      timestamp: new Date().toISOString(),
    },
  }
  connection.emit("wscp", failed)
  log.info({ message }, "WSCPConnectFailed sent")
}

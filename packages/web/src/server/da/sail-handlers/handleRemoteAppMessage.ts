import { ConnectionContext } from "./types"
import { DirectoryApp } from "@finos/fdc3-sail-da-impl"
import { WebSocketConnection } from "../connection"
import { handleFDC3AppEvent } from "./handleFDC3AppEvent"
import { createLogger } from "../../logger"

const log = createLogger("RemoteAppMessage")

/* eslint-disable  @typescript-eslint/no-explicit-any */

/**
 * Routes DACP messages from a remote/native app to the FDC3 server instance.
 * WSCP handshake (identity assignment) is handled by RemoteSocketService before
 * messages reach this handler.
 */
export function handleRemoteAppMessage(
  ctx: ConnectionContext,
  _nativeApp: DirectoryApp,
  _connection: WebSocketConnection,
  data: any,
): void {
  if (!ctx.fdc3ServerInstance) {
    log.error("No FDC3 server instance in context")
    return
  }

  const messageType = data.type

  if (!messageType) {
    log.error({ data }, "Message missing type field")
    return
  }

  if (!ctx.appInstanceId) {
    log.error({ messageType }, "Received message before WSCP handshake")
    return
  }

  handleFDC3AppEvent(ctx, data, ctx.appInstanceId)
}

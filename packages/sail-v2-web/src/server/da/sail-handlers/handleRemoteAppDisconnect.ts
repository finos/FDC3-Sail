import { State } from "@finos/fdc3-sail-da-impl"
import { ConnectionContext } from "./types"
import { WebSocketConnection } from "../connection"
import { createLogger } from "../../logger"

const log = createLogger("RemoteAppDisconnect")

/**
 * Handle disconnect for a remote/native app connected via WSCP.
 * Tears down the live socket binding but does not clear the sharedSecret pairing
 * (retained in client state for resume).
 */
export async function handleRemoteAppDisconnect(
  ctx: ConnectionContext,
  connection?: WebSocketConnection,
): Promise<void> {
  if (ctx.fdc3ServerInstance && ctx.appInstanceId) {
    const details = ctx.fdc3ServerInstance.getInstanceDetails(ctx.appInstanceId)
    // A newer WebSocket may have already superseded this one
    if (
      details?.connection &&
      connection &&
      details.connection !== connection
    ) {
      log.debug(
        { appInstanceId: ctx.appInstanceId },
        "Ignoring disconnect for superseded WebSocket",
      )
      return
    }
    if (details) {
      ctx.fdc3ServerInstance.setInstanceDetails(ctx.appInstanceId, {
        ...details,
        connection: undefined,
      })
    }
    await ctx.fdc3ServerInstance.setAppState(
      ctx.appInstanceId,
      State.Terminated,
    )
    const remaining = await ctx.fdc3ServerInstance.getConnectedApps()
    log.debug(
      { appInstanceId: ctx.appInstanceId, remainingApps: remaining.length },
      "Remote app disconnected (pairing retained for WSCP resume)",
    )
  } else {
    log.debug("Remote app disconnect: No server instance or app instance ID")
  }
}
